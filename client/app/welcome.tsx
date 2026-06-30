// Welcome — the single pre-auth value-prop page (NOT a carousel). Calm and inviting:
// quiet wordmark, the warm brand mark as the focal anchor, the serif promise, one
// primary CTA + a quiet "already have an account" link. Staggered gentle entrance.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PressableScale, enterUp } from '@/components/motion';
import { BRAND, ONBOARDING } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

// Theme-aware brand mark: wine mark on the cream light surface, cream mark on warm-dark.
const MARK_LIGHT = require('../assets/logo/logo-mono-wine-1024.png');
const MARK_DARK = require('../assets/logo/logo-mono-cream-1024.png');

export default function WelcomeScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const copy = ONBOARDING.welcome;

  // Returning users skip onboarding entirely.
  useEffect(() => {
    if (user?.onboardingDone) router.replace('/(tabs)');
  }, [user?.onboardingDone]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          paddingTop: insets.top + SPACE.xl,
          paddingBottom: insets.bottom + SPACE.lg,
        },
      ]}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      <Animated.Text entering={enterUp(0)} style={[styles.wordmark, { color: colors.textSecondary }]}>
        {BRAND.appName}
      </Animated.Text>

      <View style={styles.center}>
        <Animated.View entering={enterUp(1)} style={styles.markWrap}>
          <Image
            source={mode === 'dark' ? MARK_DARK : MARK_LIGHT}
            style={styles.mark}
            contentFit="contain"
            accessibilityLabel={`${BRAND.appName} logo`}
          />
        </Animated.View>
        <Animated.Text entering={enterUp(2)} style={[styles.headline, { color: colors.textPrimary }]}>
          {copy.headline}
        </Animated.Text>
        <Animated.Text entering={enterUp(3)} style={[styles.support, { color: colors.textSecondary }]}>
          {copy.support}
        </Animated.Text>
      </View>

      <Animated.View entering={enterUp(4)} style={styles.actions}>
        <Button label={`${copy.primaryCta} →`} onPress={() => router.push('/(auth)/register')} />
        <PressableScale style={styles.secondary} onPress={() => router.push('/(auth)/login')} haptic="light">
          <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>{copy.secondaryCta}</Text>
        </PressableScale>
        <Text style={[styles.adults, { color: colors.textTertiary }]}>{copy.adultsNote}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  wordmark: {
    fontFamily: FONTS.display.semibold,
    fontSize: 20,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.sm },
  markWrap: { marginBottom: SPACE.xl },
  mark: { width: 128, height: 128 },
  headline: { ...TYPE.headline, textAlign: 'center', marginBottom: SPACE.md },
  support: { ...TYPE.body, textAlign: 'center', maxWidth: 320 },
  actions: { gap: SPACE.sm },
  secondary: { paddingVertical: SPACE.sm, alignItems: 'center' },
  secondaryText: { fontFamily: FONTS.body.medium, fontSize: 15 },
  adults: { ...TYPE.caption, textAlign: 'center', marginTop: SPACE.xs },
});
