// The companion "considering" — a paper bubble with three dots breathing in
// slow sequence (calm, never frenetic). Shown between a sent message and the
// reply's typing reveal. Reduce-motion: dots hold at a readable mid-opacity.
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RADIUS, SPACE } from '@/constants/design';
import { DURATION, EASING } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';

const DOT_COUNT = 3;

function Dot({ index, reduceMotion }: { index: number; reduceMotion: boolean }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.5;
      return;
    }
    opacity.value = withDelay(
      index * (DURATION.normal / 2),
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: DURATION.normal, easing: EASING.ambient }),
          withTiming(0.35, { duration: DURATION.normal, easing: EASING.ambient }),
          withTiming(0.35, { duration: DURATION.normal / 2 }),
        ),
        -1,
      ),
    );
  }, [index, reduceMotion, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, { backgroundColor: colors.textTertiary }, style]} />;
}

export function ThinkingIndicator() {
  const { colors, shadows } = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <View
      style={[styles.bubble, { backgroundColor: colors.sheet }, shadows.e1]}
      accessibilityLabel="Your companion is writing"
    >
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <Dot key={i} index={i} reduceMotion={reduceMotion} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.card,
    borderBottomLeftRadius: RADIUS.tight,
    marginVertical: SPACE.xs,
  },
  dot: { width: 7, height: 7, borderRadius: RADIUS.pill },
});
