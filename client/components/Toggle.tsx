// Compact, on-brand switch — replaces the stock RN <Switch>. Smaller footprint, accent
// on-state, quiet 150ms ease (no overshoot). Adapted from Amibroke to Aura's theme.
import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { selection } from '@/utils/haptics';
import { useTheme } from '@/hooks/useTheme';

const W = 46;
const H = 28;
const PAD = 3;
const THUMB = H - PAD * 2; // 22
const TRAVEL = W - THUMB - PAD * 2; // 18

interface ToggleProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ value, onValueChange, disabled }: ToggleProps) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const p = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    p.value = reduce
      ? value
        ? 1
        : 0
      : withTiming(value ? 1 : 0, { duration: 150, easing: Easing.out(Easing.cubic) });
  }, [value, reduce]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [colors.border, colors.accent]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * TRAVEL }] }));

  return (
    <Pressable
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        selection();
        onValueChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View style={[styles.track, trackStyle, disabled && styles.disabled]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, padding: PAD, justifyContent: 'center' },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  disabled: { opacity: 0.5 },
});
