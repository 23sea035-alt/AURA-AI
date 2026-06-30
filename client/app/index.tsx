// Entry splash — a quiet warm wordmark while the app boots, then into the welcome flow. (Replaces the
// cosmic calibration-ring splash; the redesign opens on stillness, not spectacle.)
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { fadeIn } from '@/components/motion';
import { FONTS, SPACE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function SplashScreen() {
  const { colors, mode } = useTheme();
  const { isLoading } = useApp();

  useEffect(() => {
    if (isLoading) return;
    const t = setTimeout(() => router.replace('/welcome'), 800);
    return () => clearTimeout(t);
  }, [isLoading]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Animated.Text
        entering={fadeIn(0)}
        style={[styles.wordmark, { color: colors.textPrimary }]}
      >
        Aura
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  wordmark: { fontFamily: FONTS.display.semibold, fontSize: 44, letterSpacing: 0.5 },
});
