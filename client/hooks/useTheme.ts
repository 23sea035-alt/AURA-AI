// useTheme is now backed by the ThemeProvider (user preference: system | light | dark, persisted).
// Re-exported here so existing `@/hooks/useTheme` imports keep working unchanged.
export { ThemeProvider, useTheme, type Theme, type ThemePreference } from '@/context/ThemeContext';
