// Push-to-talk dictation over expo-speech-recognition (on-device SFSpeechRecognizer / Android
// SpeechRecognizer). Streams interim transcripts via onPartial, reports the final transcript +
// persisted audio clip URI via onFinal, and supports slide-to-cancel via cancel() -> onCancel (aborts
// without committing). The audio is captured (recordingOptions.persist) so it can hang off
// Message.audioUri while Message.content stays the canonical text. Exposes a normalized input `level`
// (0..1) for a live recording meter.
//
// NOTE: native module — requires a dev/custom build (not Expo Go) to actually run.
import { useCallback, useRef, useState } from 'react';

import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

interface DictationCallbacks {
  onPartial: (transcript: string) => void;
  onFinal: (info: { transcript: string; audioUri?: string }) => void;
  onCancel?: () => void;
}

interface Dictation {
  listening: boolean;
  level: number; // 0..1 normalized live input volume
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
}

// The 'volumechange' value is roughly -2 (silent) .. 10 (loud); <0 is inaudible. Map to 0..1.
function normalizeLevel(value: number): number {
  return Math.max(0, Math.min(1, value / 8));
}

export function useDictation({ onPartial, onFinal, onCancel }: DictationCallbacks): Dictation {
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const transcriptRef = useRef('');
  const audioUriRef = useRef<string | undefined>(undefined);
  const cancelingRef = useRef(false);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript ?? '';
    transcriptRef.current = transcript;
    onPartial(transcript);
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    setLevel(normalizeLevel(event.value));
  });

  useSpeechRecognitionEvent('audioend', (event) => {
    if (event.uri) audioUriRef.current = event.uri;
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setLevel(0);
    if (cancelingRef.current) {
      cancelingRef.current = false;
      return; // canceled — onCancel already fired, drop the transcript
    }
    onFinal({ transcript: transcriptRef.current, audioUri: audioUriRef.current });
  });

  useSpeechRecognitionEvent('error', () => {
    setListening(false);
    setLevel(0);
  });

  const start = useCallback(async () => {
    const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perms.granted) return;
    transcriptRef.current = '';
    audioUriRef.current = undefined;
    cancelingRef.current = false;
    setLevel(0);
    setListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      // false = allow Apple's server-based recognition (better accuracy on long/noisy speech).
      // Set true for strictly on-device (offline + private, slightly lower accuracy).
      requiresOnDeviceRecognition: false,
      recordingOptions: { persist: true }, // emits { uri } on 'audioend' -> Message.audioUri
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 }, // drives the live meter
    });
  }, []);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelingRef.current = true;
    setListening(false);
    setLevel(0);
    ExpoSpeechRecognitionModule.abort(); // discard without processing a final result
    onCancel?.();
  }, [onCancel]);

  return { listening, level, start, stop, cancel };
}
