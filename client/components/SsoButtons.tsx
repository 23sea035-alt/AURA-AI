// Continue with Apple / Google — neutral outlined buttons with system glyphs (NOT accent-tinted),
// per the auth spec. Apple is gated to iOS (Sign in with Apple is iOS-native; on Android it's
// dropped). UI shell only -- real OAuth is Clerk-wired later.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { PressableScale } from '@/components/motion';
import { ONBOARDING } from '@/constants/content';
import { FONTS, RADIUS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export function SsoButtons({ onApple, onGoogle }: { onApple: () => void; onGoogle: () => void }) {
  const { colors } = useTheme();
  const a = ONBOARDING.auth;
  return (
    <View style={styles.row}>
      {Platform.OS === 'ios' ? (
        <PressableScale
          onPress={onApple}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel={a.ctas.apple}
          style={[styles.btn, { borderColor: colors.border, backgroundColor: colors.raised }]}
        >
          <Ionicons name="logo-apple" size={18} color={colors.textPrimary} />
          <Text style={[styles.label, { color: colors.textPrimary }]}>{a.ctas.apple}</Text>
        </PressableScale>
      ) : null}
      <PressableScale
        onPress={onGoogle}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={a.ctas.google}
        style={[styles.btn, { borderColor: colors.border, backgroundColor: colors.raised }]}
      >
        <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
        <Text style={[styles.label, { color: colors.textPrimary }]}>{a.ctas.google}</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACE.sm },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    height: 52,
    borderWidth: 1,
    borderRadius: RADIUS.card,
  },
  label: { fontFamily: FONTS.body.semibold, fontSize: 15 },
});
