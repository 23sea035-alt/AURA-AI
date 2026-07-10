// The LIVE voice-call loop (half-duplex v1): the client records one utterance at a time
// with expo-audio + a simple energy VAD (metering-driven end-of-utterance), ships the raw
// bytes as ONE binary WS frame (the server sniffs the container before Whisper), and the
// reply comes back as per-sentence Inworld MP3 frames + voice_caption text, played in order.
//
//   connecting ──voice_ready──▶ listening ──utterance sent──▶ thinking
//        ▲                          ▲                             │ first audio frame
//        │                          └────queue drained + ─────────▼
//        └── socket lost            voice_complete           speaking
//
// Why NOT SFSpeechRecognizer for capture: it fails outright where Apple's local speech
// assets are missing (every iOS simulator: kLSRErrorDomain 300 "Failed to initialize
// recognizer") or dictation is disabled (201) — and the server does Whisper anyway, so the
// recognizer only ever provided VAD + a recorder. Composer dictation still uses it.
//
// The socket is the SAME refcounted instance the chat screen holds (the server allows one
// per companion). Metering is server-authoritative: REST /voice/start gates before the mic
// turns on; voice_ready carries remainingSeconds; abort voice_limit_reached ends the call.
// Barge-in / resume-after-interrupt is deliberately post-v1 (spec §3 as-built note).
import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';

import { startVoiceCall, stopVoiceCall } from '@/lib/backend';
import { MAX_UTTERANCE_BYTES, paceMultiplier, type VoicePace } from '@aura/shared';
import { acquireChatSocket, releaseChatSocket, type ChatSocket } from '@/lib/websocket';
import { playBoosted, stopBoosted } from '@/modules/audio-boost';

export type VoiceCallState = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'limit' | 'error';

// Dev-only tracing: silence and re-arms are the IDLE loop, not faults — which makes field
// debugging impossible without these lines.
const trace = (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  if (__DEV__) console.log('[voice]', ...args);
};

const READY_TIMEOUT_MS = 15_000;

// Adaptive energy VAD over the recorder's metering (dBFS, negative; ~-160 = silence).
// A fixed threshold false-triggers on ambient noise (observed live: background sound kept
// starting turns) — so the loop tracks the room's noise floor (falls fast, rises very
// slowly) and only counts polls a MARGIN above it, several in a row, as speech.
const METER_POLL_MS = 150;
const SPEECH_MARGIN_DB = 12; // speech must rise this far above the room's floor
const SPEECH_MIN_THRESHOLD_DB = -50; // …and the trigger line never sinks below this
const SPEECH_MIN_POLLS = 3; // ≈450 ms of voiced audio before it counts as speech
const NOISE_FLOOR_RISE = 0.02; // slow upward drift so speech can't raise the floor
const SILENCE_END_MS = 1000; // this long below threshold after speech = utterance over
const MIN_UTTERANCE_MS = 500; // ignore blips
const NO_SPEECH_RECYCLE_MS = 15_000; // quiet room: rotate the file, keep listening
const MAX_UTTERANCE_MS = 55_000; // hard bound (~server's 2 MB ceiling)
const RECAPTURE_DELAY_MS = 300;

interface VoiceCall {
  state: VoiceCallState;
  /** Latest spoken sentence (server voice_caption) — shown while speaking, captions pref permitting. */
  caption: string | null;
  /** Server-authoritative monthly budget at call open (null until voice_ready). */
  remainingSeconds: number | null;
}

export function useVoiceCall(opts: {
  companionId: string;
  enabled: boolean;
  muted: boolean;
  pace?: VoicePace;
  /** Per-persona playback boost in dB (constants/voiceGain). 0/undefined = normal player. */
  gainDb?: number;
}): VoiceCall {
  const { companionId, enabled, muted, pace, gainDb = 0 } = opts;
  // Pace is a PLAYBACK rate (pitch-preserving) applied per sentence — synthesis always happens at
  // the persona's tuned base tempo server-side. The ref keeps the current pref reachable from the
  // play loop without re-arming it, so a mid-call pace change is heard on the very next sentence.
  const paceRef = useRef(pace);
  paceRef.current = pace;
  const gainDbRef = useRef(gainDb);
  gainDbRef.current = gainDb;
  const [state, setState] = useState<VoiceCallState>('connecting');
  const [caption, setCaption] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;

  const socketRef = useRef<ChatSocket | null>(null);
  // Each queued sentence carries its crisis flag (latched from the caption frame, which always
  // precedes its audio frame) — crisis sentences play at natural rate regardless of the user's pace.
  const queueRef = useRef<{ file: File; crisis: boolean }[]>([]);
  const crisisByIndexRef = useRef<Map<number, boolean>>(new Map());
  const playingRef = useRef(false);
  const turnDoneRef = useRef(false);
  const capturingRef = useRef(false);
  const meterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const stateRef = useRef(state);
  stateRef.current = state;
  const aliveRef = useRef(false);

  const stopMeter = useCallback(() => {
    if (meterTimerRef.current) {
      clearInterval(meterTimerRef.current);
      meterTimerRef.current = null;
    }
  }, []);

  const shipUtterance = useCallback(async (uri: string) => {
    try {
      const file = new File(uri);
      const bytes = await file.bytes();
      try {
        file.delete();
      } catch {
        // recording temp file — the OS reclaims it anyway
      }
      if (!aliveRef.current) return false;
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_UTTERANCE_BYTES) return false;
      if (socketRef.current?.sendUtterance(bytes)) {
        trace('utterance sent:', bytes.byteLength, 'bytes');
        setState('thinking');
        return true;
      }
      return false;
    } catch (err) {
      trace('utterance read failed:', err);
      return false;
    }
  }, []);

  const startCapture = useCallback(() => {
    if (!aliveRef.current || capturingRef.current || mutedRef.current) return;
    capturingRef.current = true;
    void (async () => {
      try {
        const rec = recorderRef.current;
        await rec.prepareToRecordAsync();
        rec.record();
        trace('capture start (recorder)');
        let sawSpeech = false;
        let loudPolls = 0;
        let noiseFloor = -60;
        let lastLoudAt = Date.now();
        const startedAt = Date.now();

        const finish = async (send: boolean) => {
          stopMeter();
          let uri: string | null = null;
          try {
            await rec.stop();
            uri = rec.uri;
          } catch {
            uri = null;
          }
          capturingRef.current = false;
          if (!aliveRef.current || stateRef.current !== 'listening') return;
          const shipped = send && uri ? await shipUtterance(uri) : false;
          if (!shipped) {
            setTimeout(() => {
              if (aliveRef.current && stateRef.current === 'listening') startCapture();
            }, RECAPTURE_DELAY_MS);
          }
        };

        stopMeter();
        meterTimerRef.current = setInterval(() => {
          if (!aliveRef.current || mutedRef.current || stateRef.current !== 'listening') {
            void finish(false);
            return;
          }
          const status = rec.getStatus();
          const db = status.metering ?? -160;
          const now = Date.now();
          // Room floor: follow quiet instantly, drift up only slowly under sustained sound.
          if (db < noiseFloor) noiseFloor = db;
          else noiseFloor += (db - noiseFloor) * NOISE_FLOOR_RISE;
          const threshold = Math.max(noiseFloor + SPEECH_MARGIN_DB, SPEECH_MIN_THRESHOLD_DB);
          if (db > threshold) {
            loudPolls += 1;
            lastLoudAt = now;
            if (!sawSpeech && loudPolls >= SPEECH_MIN_POLLS) {
              sawSpeech = true;
              trace('speech detected', Math.round(db), 'dB (floor', Math.round(noiseFloor), ')');
            }
          }
          const elapsed = now - startedAt;
          if (sawSpeech && now - lastLoudAt > SILENCE_END_MS && elapsed > MIN_UTTERANCE_MS) {
            void finish(true); // end of utterance
          } else if (!sawSpeech && elapsed > NO_SPEECH_RECYCLE_MS) {
            void finish(false); // quiet room — rotate the file, keep listening
          } else if (elapsed > MAX_UTTERANCE_MS) {
            void finish(sawSpeech);
          }
        }, METER_POLL_MS);
      } catch (err) {
        trace('recorder start failed:', err);
        capturingRef.current = false;
        setTimeout(() => {
          if (aliveRef.current && stateRef.current === 'listening') startCapture();
        }, 1500);
      }
    })();
  }, [shipUtterance, stopMeter]);

  // Mute stops the mic mid-listen (the meter loop notices and discards); unmute re-arms.
  useEffect(() => {
    if (!enabled) return;
    if (!muted && stateRef.current === 'listening') startCapture();
  }, [muted, enabled, startCapture]);

  useEffect(() => {
    if (!enabled || !companionId || companionId.startsWith('local-')) return;
    aliveRef.current = true;
    let readyTimer: ReturnType<typeof setTimeout> | null = null;
    let waitTimer: ReturnType<typeof setInterval> | null = null;
    let frameSeq = 0;
    // The ref's Map is created once and never reassigned — capture it so the cleanup below
    // clears the same instance (and the exhaustive-deps ref-in-cleanup heuristic stays quiet).
    const crisisByIndex = crisisByIndexRef.current;

    const player = createAudioPlayer();
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
      // The user's pace applies at playback (pitch-preserved), read fresh per sentence; crisis
      // sentences pin to natural — a "quick" pace must never rush a 988 reply.
      const rate = next.crisis ? 1.0 : paceMultiplier(paceRef.current);
      // Quiet casts route through the native boosted player (AVAudioEngine gain — expo-audio's
      // volume can't amplify past 1.0); everyone else keeps the stock player. Completion drives
      // the queue either way: the boosted promise here, didJustFinish below for the stock path.
      const boost = gainDbRef.current;
      if (boost > 0) {
        playBoosted(next.file.uri, boost, rate)
          .catch((err) => trace('boosted playback failed:', err))
          .finally(() => {
            if (!aliveRef.current) return;
            playingRef.current = false;
            playNext();
          });
        return;
      }
      player.setPlaybackRate(rate, 'high');
      player.replace({ uri: next.file.uri });
      player.play();
    };
    const statusSub = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish) return;
      playingRef.current = false;
      playNext();
    });

    void (async () => {
      // allowsRecording keeps the session in playAndRecord for the whole call (record +
      // playback alternate in the half-duplex loop).
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true }).catch(() => {});
      const perms = await AudioModule.requestRecordingPermissionsAsync();
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
          trace('voice_ready, remaining:', remaining);
          // Also re-sent after a silent/no-speech utterance — either way: back to listening.
          if (stateRef.current === 'connecting' || stateRef.current === 'thinking') {
            setState('listening');
            startCapture();
          }
        },
        onCaption: (index, text, crisis) => {
          crisisByIndex.set(index, crisis);
          setCaption(text);
        },
        onAudio: (index, mp3) => {
          trace('audio frame:', mp3.byteLength, 'bytes');
          const crisis = crisisByIndex.get(index) ?? false;
          const file = new File(Paths.cache, `voice-${companionId.slice(0, 8)}-${frameSeq++}.mp3`);
          void (async () => {
            try {
              await file.write(mp3);
              if (!aliveRef.current) return;
              queueRef.current.push({ file, crisis });
              playNext();
            } catch {
              // A dropped frame degrades one sentence of audio, never the call.
            }
          })();
        },
        onComplete: () => {
          turnDoneRef.current = true;
          crisisByIndex.clear(); // indexes are per-turn; drop the finished turn's flags
          if (!playingRef.current) playNext(); // silent turn (e.g. uncast persona) → keep the loop alive
        },
        onAbort: (code) => {
          trace('voice abort:', code);
          if (code === 'voice_limit_reached') setState('limit');
          else if (code === 'utterance_too_large' || code === 'rate_limited') {
            setState('listening');
            startCapture();
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
      stopMeter();
      if (capturingRef.current) {
        capturingRef.current = false;
        recorderRef.current.stop().catch(() => {});
      }
      statusSub.remove();
      player.remove();
      stopBoosted();
      queueRef.current.forEach(({ file }) => {
        try {
          file.delete();
        } catch {
          // cache files — the OS reclaims them anyway
        }
      });
      queueRef.current = [];
      crisisByIndex.clear();
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
