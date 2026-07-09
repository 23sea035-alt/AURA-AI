// Voice preferences — persisted locally, read by the voice call. Voice TIMBRE is fixed per persona
// (server-side Inworld casting), so there is no user voice picker; these are captions + speaking pace.
// The pace is sent on voice_start and multiplies each persona's base voice rate server-side.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { VoicePace } from '@aura/shared';

export interface VoicePrefs {
  /** Live captions of what the companion says during a call. */
  captions: boolean;
  /** Speaking pace — multiplies the persona's base voice rate (relaxed / natural / quick). */
  pace: VoicePace;
}

const DEFAULTS: VoicePrefs = { captions: true, pace: 'natural' };
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
