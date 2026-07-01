// Shared small "conversation riding the thread" bubble for ThreadArt — same technique as
// WarmBubble (one continuous silhouette, tail pulled from the body, no separate diamond nub),
// just smaller and single-line. Ported from onboarding-app.jsx's ThreadArt `Mini` helper.
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Filter, FeDropShadow, Path, Rect } from 'react-native-svg';

import { DURATION, EASING } from '@/constants/motion';

const BODY_PATH =
  'M 15,4 L 41,4 Q 50,4 50,13 L 50,21 Q 50,30 41,30 L 29,30 C 25,30 22,35 18,38 C 21,34 22,32 24,30 L 15,30 Q 6,30 6,21 L 6,13 Q 6,4 15,4 Z';

const STOPS_LIGHT: [string, string] = ['#EFE0C6', '#E0CCA4'];
const STOPS_DARK: [string, string] = ['#3B3025', '#2C2319'];
const LINE_LIGHT = 'rgba(120,84,52,0.18)';
const LINE_DARK = 'rgba(244,236,223,0.18)';
const FLOOD_LIGHT = '#785434';
const FLOOD_DARK = '#000000';

type Props = {
  id: string;
  dark: boolean;
  left: number;
  top: number;
  /** Mirrors the silhouette so the tail points the other way. */
  tailLeft: boolean;
  delayMs: number;
  reduceMotion: boolean;
};

export function MiniBubble({ id, dark, left, top, tailLeft, delayMs, reduceMotion }: Props) {
  const stops = dark ? STOPS_DARK : STOPS_LIGHT;
  const lineColor = dark ? LINE_DARK : LINE_LIGHT;
  const flood = dark ? FLOOD_DARK : FLOOD_LIGHT;

  // The carousel screen only ever mounts the current slide, so this component's own mount IS the
  // "just became active" moment — no separate active/playKey gating needed to replay the settle.
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(delayMs, withTiming(1, { duration: DURATION.settle, easing: EASING.settle }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 16 },
      { scale: 0.95 + progress.value * 0.05 },
      { scaleX: tailLeft ? 1 : -1 },
    ],
  }));

  return (
    <Animated.View style={[styles.wrap, { left, top }, style]}>
      <Svg width={56} height={44} viewBox="0 0 56 44">
        <Defs>
          <LinearGradient id={`mb-${id}`} x1="0" y1="0" x2="0.25" y2="1">
            <Stop offset="0" stopColor={stops[0]} />
            <Stop offset="1" stopColor={stops[1]} />
          </LinearGradient>
          <Filter id={`mbs-${id}`} x="-40%" y="-40%" width="180%" height="200%">
            <FeDropShadow dx={0} dy={4} stdDeviation={3.5} floodColor={flood} floodOpacity={dark ? 0.36 : 0.16} />
          </Filter>
        </Defs>
        <Path d={BODY_PATH} fill={`url(#mb-${id})`} filter={`url(#mbs-${id})`} />
        <Rect x={16} y={14.5} width={23} height={3.6} rx={1.8} fill={lineColor} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', width: 56, height: 44 },
});
