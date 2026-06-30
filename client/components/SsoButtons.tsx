// Continue with Apple / Google — neutral outlined buttons. Apple uses the monochrome system glyph
// (matches the button text, per Apple's HIG); Google uses its official multi-color "G" (per Google's
// Sign-in brand guidelines). Apple is gated to iOS. UI shell only -- real OAuth is Clerk-wired later.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PressableScale } from '@/components/motion';
import { ONBOARDING } from '@/constants/content';
import { FONTS, RADIUS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </Svg>
  );
}

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
        <GoogleG size={18} />
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
