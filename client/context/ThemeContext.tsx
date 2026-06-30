// Theme: warm-light / warm-dark, with a user preference (system | light | dark) persisted across
// launches. `system` follows the device appearance (app.json userInterfaceStyle: automatic). Feeds
// useTheme so every screen — and its StatusBar — tracks the choice with no per-screen wiring.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { COLORS, SHADOWS, type ThemeColors, type ThemeMode, type ThemeShadows } from '@/constants/design';

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'themePreference';

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  shadows: ThemeShadows;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<Theme | null>(null);

function resolveMode(preference: ThemePreference, device: ReturnType<typeof useColorScheme>): ThemeMode {
  if (preference === 'light' || preference === 'dark') return preference;
  return device === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const device = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'system' || v === 'light' || v === 'dark') setPreferenceState(v);
    });
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  };

  const mode = resolveMode(preference, device);

  return (
    <ThemeContext.Provider value={{ mode, colors: COLORS[mode], shadows: SHADOWS[mode], preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  const device = useColorScheme();
  if (ctx) return ctx;
  // Defensive fallback if a consumer renders outside the provider: device-driven, no-op setter.
  const mode = resolveMode('system', device);
  return { mode, colors: COLORS[mode], shadows: SHADOWS[mode], preference: 'system', setPreference: () => {} };
}
