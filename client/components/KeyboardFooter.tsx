// Floating footer that docks a screen's primary CTA at the bottom and rises with the keyboard.
// Its paddingBottom tracks the keyboard: the full home-indicator inset at rest, a snug SPACE.md
// when the keyboard is up (the keyboard covers the home-indicator area, so that inset would read
// as dead gap above it). Same reanimated pattern as the chat composer.
//
// Usage: place as a sibling of the ScrollView, both inside a keyboard-controller
// `KeyboardAvoidingView` (behavior 'padding'). Give the ScrollView's content a paddingBottom of
// ~insets.bottom + 120 so its last row clears the footer.
import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export function KeyboardFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { progress } = useReanimatedKeyboardAnimation();
  const padStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(progress.value, [0, 1], [insets.bottom + SPACE.lg, SPACE.md], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View
      style={[styles.footer, padStyle, { backgroundColor: colors.bg, borderTopColor: colors.divider }, style]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: SPACE.sm,
  },
});
