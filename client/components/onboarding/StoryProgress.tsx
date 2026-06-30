// Instagram-Stories-style segmented progress for the onboarding carousel. The ACTIVE segment
// fills live over `duration` — it IS the auto-advance timer, so the bar and the transition are
// always in sync (it calls onComplete when full). Past segments are full, future empty. Restarts
// when `index` changes (manual tap-zone nav). Reduced motion: active shows full + a plain timeout.
// This is the reusable carousel mechanism; the per-slide scene visuals are built per screen.
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface StoryProgressProps {
  total: number;
  index: number;
  duration: number;
  onComplete: () => void;
}

export function StoryProgress({ total, index, duration, onComplete }: StoryProgressProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Segment
          key={i}
          state={i < index ? 'full' : i === index ? 'active' : 'empty'}
          duration={duration}
          restartKey={index}
          trackColor={colors.border}
          fillColor={colors.accent}
          onComplete={onComplete}
        />
      ))}
    </View>
  );
}

interface SegmentProps {
  state: 'full' | 'active' | 'empty';
  duration: number;
  restartKey: number;
  trackColor: string;
  fillColor: string;
  onComplete: () => void;
}

function Segment({ state, duration, restartKey, trackColor, fillColor, onComplete }: SegmentProps) {
  const reduce = useReducedMotion();
  const fill = useSharedValue(state === 'full' ? 1 : 0);

  useEffect(() => {
    if (state === 'full') {
      fill.value = 1;
      return;
    }
    if (state === 'empty') {
      fill.value = 0;
      return;
    }
    // active — fill from 0, advance when it completes
    fill.value = 0;
    if (reduce) {
      fill.value = 1;
      const t = setTimeout(onComplete, duration);
      return () => clearTimeout(t);
    }
    fill.value = withTiming(1, { duration, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(onComplete)();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, restartKey, reduce]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <Animated.View style={[styles.fill, { backgroundColor: fillColor }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignSelf: 'stretch' },
  track: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, transformOrigin: 'left' },
});
