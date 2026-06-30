// Warm Sanctuary button — solid wine accent (no neon gradient), built on PressableScale so
// every tap springs + haptics and honors reduce-motion. Replaces the cosmic AuraButton.
import React from 'react';
import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { PressableScale } from '@/components/motion';
import { FONTS, SPACE, RADIUS } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

type Variant = 'primary' | 'secondary' | 'tinted' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  /** primary=solid accent · secondary=hairline outline · tinted=accent wash · ghost=text only · danger=solid error. */
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const HEIGHTS: Record<Size, number> = { lg: 56, md: 48, sm: 40 };
const FONT_SIZES: Record<Size, number> = { lg: 17, md: 16, sm: 14 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  icon,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  // Fill / text / optional border resolved from the active theme.
  const fills: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.accent, fg: colors.onAccent },
    secondary: { bg: 'transparent', fg: colors.textPrimary, border: colors.border },
    tinted: { bg: colors.accentTint, fg: colors.accent },
    ghost: { bg: 'transparent', fg: colors.accent },
    danger: { bg: colors.error, fg: colors.onAccent },
  };
  const v = fills[variant];
  const spinnerColor = variant === 'primary' || variant === 'danger' ? colors.onAccent : colors.accent;

  return (
    <PressableScale
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      haptic={variant === 'primary' ? 'medium' : 'light'}
      style={[
        styles.base,
        {
          height: HEIGHTS[size],
          backgroundColor: v.bg,
          borderRadius: variant === 'ghost' ? 0 : RADIUS.card,
        },
        v.border ? { borderWidth: 1.5, borderColor: v.border } : null,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View style={styles.inner}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.label, { color: v.fg, fontSize: FONT_SIZES[size] }]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.lg },
  inner: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  icon: { alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: FONTS.body.semibold, letterSpacing: -0.2 },
  disabled: { opacity: 0.45 },
});
