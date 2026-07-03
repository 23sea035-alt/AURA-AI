// Voice preferences — persisted locally, read by the voice call.
// WIRE SEAM: voice becomes per-companion (companions.voice_id, Inworld) once the
// backend lands; `voiceId` here maps onto that column, and the prefs move to
// PUT /api/voice-preferences. The hook's shape stays the same.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export interface VoicePrefs {
  /** Selected voice (maps to companions.voice_id / an Inworld voice). */
  voiceId: string;
  /** Live captions of what the companion says during a call. */
  captions: boolean;
  /** Speaking pace. */
  pace: 'relaxed' | 'natural' | 'brisk';
}

export const VOICE_OPTIONS: { id: string; name: string; feel: string }[] = [
  { id: 'ember', name: 'Ember', feel: 'Warm and low, unhurried' },
  { id: 'dawn', name: 'Dawn', feel: 'Soft and bright, gentle lift' },
  { id: 'river', name: 'River', feel: 'Calm and even, steady' },
];

const DEFAULTS: VoicePrefs = { voiceId: 'ember', captions: true, pace: 'natural' };
const KEY = 'voicePrefs';

export function useVoicePrefs() {
  const [prefs, setPrefs] = useState<VoicePrefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<VoicePrefs>) });
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((updates: Partial<VoicePrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { prefs, update, loaded };
}
