// The LIVE voice-call loop (half-duplex v1): Apple's native VAD chunks one utterance per
// recognition session (continuous:false + recordingOptions.persist → audio file), the raw
// bytes go up as ONE binary WS frame (the server sniffs the container before Whisper), and
// the reply comes back as per-sentence MP3 frames + voice_caption text, played in order.
//
//   connecting ──voice_ready──▶ listening ──utterance sent──▶ thinking
//        ▲                          ▲                             │ first audio frame
//        │                          └────queue drained + ─────────▼
//        └── socket lost            voice_complete           speaking
//
// The socket is the SAME refcounted instance the chat screen holds (the server allows one
// per companion). Metering is server-authoritative: REST /voice/start gates before the mic
// turns on; voice_ready carries remainingSeconds; abort voice_limit_reached ends the call.
// Barge-in / resume-after-interrupt is deliberately post-v1 (spec §3 as-built note).
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';

import { startVoiceCall, stopVoiceCall } from '@/lib/backend';
import { acquireChatSocket, releaseChatSocket, type ChatSocket } from '@/lib/websocket';

export type VoiceCallState = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'limit' | 'error';

// A recognition session with no speech "ends" quickly — keep re-arming the mic while the
// user is quiet instead of treating it as an error (silence prompts are a post-v1 nicety).
const RECAPTURE_DELAY_MS = 350;
const READY_TIMEOUT_MS = 15_000;
const MAX_UTTERANCE_BYTES = 2_000_000; // mirror of @aura/shared server bound

interface VoiceCall {
  state: VoiceCallState;
  /** Latest spoken sentence (server voice_caption) — shown while speaking, captions pref permitting. */
  caption: string | null;
  /** Server-authoritative monthly budget at call open (null until voice_ready). */
  remainingSeconds: number | null;
}

export function useVoiceCall(opts: { companionId: string; enabled: boolean; muted: boolean }): VoiceCall {
  const { companionId, enabled, muted } = opts;
  const [state, setState] = useState<VoiceCallState>('connecting');
  const [caption, setCaption] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const socketRef = useRef<ChatSocket | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const queueRef = useRef<File[]>([]);
  const playingRef = useRef(false);
  const turnDoneRef = useRef(false);
  const capturingRef = useRef(false);
  const ownSessionRef = useRef(false);
  const audioUriRef = useRef<string | undefined>(undefined);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const stateRef = useRef(state);
  stateRef.current = state;
  const aliveRef = useRef(false);

  const startCapture = useCallback(() => {
    if (!aliveRef.current || capturingRef.current || mutedRef.current) return;
    capturingRef.current = true;
    ownSessionRef.current = true;
    audioUriRef.current = undefined;
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: false,
      continuous: false, // Apple VAD ends the session at end-of-utterance — our chunking
      requiresOnDeviceRecognition: false,
      recordingOptions: { persist: true }, // the utterance audio we actually ship
    });
  }, []);

  const scheduleRecapture = useCallback(() => {
    setTimeout(() => {
      if (aliveRef.current && stateRef.current === 'listening') startCapture();
    }, RECAPTURE_DELAY_MS);
  }, [startCapture]);

  // Utterance finished (Apple VAD fired): ship the recorded bytes as one binary frame.
  useSpeechRecognitionEvent('audioend', (event) => {
    if (!ownSessionRef.current) return;
    if (event.uri) audioUriRef.current = event.uri;
  });
  useSpeechRecognitionEvent('end', () => {
    if (!ownSessionRef.current) return;
    ownSessionRef.current = false;
    capturingRef.current = false;
    if (!aliveRef.current || stateRef.current !== 'listening') return;
    const uri = audioUriRef.current;
    if (!uri) {
      scheduleRecapture(); // silence — re-arm and keep listening
      return;
    }
    void (async () => {
      try {
        const file = new File(uri);
        const bytes = await file.bytes();
        try {
          file.delete();
        } catch {
          // recording temp file — the OS reclaims it anyway
        }
        if (!aliveRef.current) return;
        if (bytes.byteLength === 0 || bytes.byteLength > MAX_UTTERANCE_BYTES) {
          scheduleRecapture();
          return;
        }
        if (socketRef.current?.sendUtterance(bytes)) {
          setState('thinking');
        } else {
          scheduleRecapture();
        }
      } catch {
        scheduleRecapture();
      }
    })();
  });
  useSpeechRecognitionEvent('error', () => {
    if (!ownSessionRef.current) return;
    ownSessionRef.current = false;
    capturingRef.current = false;
    if (aliveRef.current && stateRef.current === 'listening') scheduleRecapture(); // e.g. no-speech
  });

  // Mute stops the mic mid-listen; unmute re-arms it.
  useEffect(() => {
    if (!enabled) return;
    if (muted && capturingRef.current) {
      ExpoSpeechRecognitionModule.abort();
    } else if (!muted && stateRef.current === 'listening') {
      startCapture();
    }
  }, [muted, enabled, startCapture]);

  useEffect(() => {
    if (!enabled || !companionId || companionId.startsWith('local-')) return;
    aliveRef.current = true;
    let readyTimer: ReturnType<typeof setTimeout> | null = null;
    let waitTimer: ReturnType<typeof setInterval> | null = null;
    let frameSeq = 0;

    const player = createAudioPlayer();
    playerRef.current = player;
    const playNext = () => {
      if (!aliveRef.current || playingRef.current) return;
      const next = queueRef.current.shift();
      if (!next) {
        if (turnDoneRef.current) {
          turnDoneRef.current = false;
          setCaption(null);
          setState('listening');
          startCapture();
        }
        return;
      }
      playingRef.current = true;
      setState('speaking');
      player.replace({ uri: next.uri });
      player.play();
    };
    const statusSub = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish) return;
      playingRef.current = false;
      playNext();
    });

    void (async () => {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true }).catch(() => {});
      const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perms.granted) {
        setState('error');
        return;
      }
      // Server-authoritative budget gate BEFORE the mic ever runs.
      const gate = await startVoiceCall().catch(() => ({ allowed: true, remainingSeconds: 0 }));
      if (!aliveRef.current) return;
      if (!gate.allowed) {
        setState('limit');
        return;
      }

      const socket = acquireChatSocket(companionId);
      socketRef.current = socket;
      socket.setVoiceHandlers({
        onReady: (remaining) => {
          if (readyTimer) clearTimeout(readyTimer);
          setRemainingSeconds(remaining);
          // Also re-sent after a silent/no-speech utterance — either way: back to listening.
          if (stateRef.current === 'connecting' || stateRef.current === 'thinking') {
            setState('listening');
            startCapture();
          }
        },
        onCaption: (_index, text) => setCaption(text),
        onAudio: (_index, mp3) => {
          const file = new File(Paths.cache, `voice-${companionId.slice(0, 8)}-${frameSeq++}.mp3`);
          void (async () => {
            try {
              await file.write(mp3);
              if (!aliveRef.current) return;
              queueRef.current.push(file);
              playNext();
            } catch {
              // A dropped frame degrades one sentence of audio, never the call.
            }
          })();
        },
        onComplete: () => {
          turnDoneRef.current = true;
          if (!playingRef.current) playNext(); // silent turn (e.g. uncast persona) → keep the loop alive
        },
        onAbort: (code) => {
          if (code === 'voice_limit_reached') setState('limit');
          else if (code === 'utterance_too_large' || code === 'rate_limited') {
            setState('listening');
            scheduleRecapture();
          } else setState('error');
        },
      });

      // The shared socket may still be dialing (or mid-cycle) — start voice once it's up.
      const tryStart = () => {
        if (!aliveRef.current) return true;
        if (socket.ready) {
          socket.startVoice(new Date().toISOString());
          return true;
        }
        return false;
      };
      if (!tryStart()) {
        waitTimer = setInterval(() => {
          if (tryStart() && waitTimer) {
            clearInterval(waitTimer);
            waitTimer = null;
          }
        }, 250);
      }
      readyTimer = setTimeout(() => {
        if (aliveRef.current && stateRef.current === 'connecting') setState('error');
      }, READY_TIMEOUT_MS);
    })();

    return () => {
      aliveRef.current = false;
      if (readyTimer) clearTimeout(readyTimer);
      if (waitTimer) clearInterval(waitTimer);
      if (ownSessionRef.current) {
        ownSessionRef.current = false;
        ExpoSpeechRecognitionModule.abort();
      }
      capturingRef.current = false;
      statusSub.remove();
      player.remove();
      playerRef.current = null;
      queueRef.current.forEach((f) => {
        try {
          f.delete();
        } catch {
          // cache files — the OS reclaims them anyway
        }
      });
      queueRef.current = [];
      playingRef.current = false;
      turnDoneRef.current = false;
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.stopVoice();
        socket.clearVoiceHandlers();
        releaseChatSocket(companionId);
      }
      void stopVoiceCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, companionId]);

  return { state, caption, remainingSeconds };
}
