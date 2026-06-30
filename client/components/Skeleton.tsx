// Loading placeholder — a soft opacity-pulsing block. Compose these to mirror a screen's
// real layout so content swaps in without a jump. Honors Reduce Motion (static dim block).
import React, { useEffect } from 'react';
import { type ViewStyle, type StyleProp, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { RADIUS } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 14, radius = RADIUS.edit, style }: SkeletonProps) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const o = useSharedValue(reduce ? 0.6 : 0.45);

  useEffect(() => {
    if (reduce) return;
    o.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [reduce]);

  const pulse = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.border }, pulse, style]}
    />
  );
}
