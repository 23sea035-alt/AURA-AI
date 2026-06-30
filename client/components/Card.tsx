// Warm Sanctuary surface card. Per the design doctrine (design.ts): INTIMATE surfaces get a
// tonal fill + soft warm shadow and no hard outline (`soft`); STRUCTURAL surfaces get a crisp
// warm hairline and no shadow (`outlined`). Replaces the cosmic glassmorphism GlassCard.
import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { RADIUS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

type CardVariant = 'soft' | 'outlined' | 'plain';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'soft', padding = SPACE.lg, style }: CardProps) {
  const { colors, shadows } = useTheme();

  const variantStyle: ViewStyle =
    variant === 'soft'
      ? { backgroundColor: colors.raised, ...shadows.e1 }
      : variant === 'outlined'
        ? {
            backgroundColor: colors.raised,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
          }
        : { backgroundColor: colors.raised };

  return <View style={[styles.base, variantStyle, { padding }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { borderRadius: RADIUS.card },
});
