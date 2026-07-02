// Shared "painted talk bubble" for the onboarding carousel (ChatArt's two bubbles + PresenceArt's
// steady one, which reuses COMPANION_BUBBLE unchanged). One continuous SVG silhouette whose
// bottom edge pulls into a tapering tail — never a separate rotated-square nub — filled with a
// soft tonal gradient (light crown -> deeper base) and a colored drop-shadow, same painted-surface
// family as MiniBubble. Ported from docs/redesign/claude-design/onboarding-app.jsx (ChatArt/PresenceArt).
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Filter, FeDropShadow, Path } from 'react-native-svg';

import { DURATION, EASING } from '@/constants/motion';

export type BubblePreset = {
  bodyPath: string;
  vbW: number;
  vbH: number;
  w: number;
  h: number;
  stopsLight: [string, string];
  stopsDark: [string, string];
  lineLight: string;
  lineDark: string;
};

// companion — warm sand paper, tail dips bottom-left
export const COMPANION_BUBBLE: BubblePreset = {
  bodyPath:
    'M 42,12 L 134,12 Q 164,12 164,42 L 164,62 Q 164,92 134,92 L 80,92 C 66,92 54,106 44,118 C 40,106 40,98 46,92 L 42,92 Q 12,92 12,62 L 12,42 Q 12,12 42,12 Z',
  vbW: 176,
  vbH: 132,
  w: 152,
  h: 80,
  stopsLight: ['#EFE0C6', '#E0CCA4'],
  stopsDark: ['#3B3025', '#2C2319'],
  lineLight: 'rgba(120,84,52,0.15)',
  lineDark: 'rgba(244,236,223,0.15)',
};

// user reply — soft clay/terracotta, tail dips bottom-right
export const USER_BUBBLE: BubblePreset = {
  bodyPath:
    'M 38,12 L 106,12 Q 132,12 132,38 L 132,50 Q 132,76 106,76 C 116,86 120,94 122,104 C 110,96 100,84 90,76 L 38,76 Q 12,76 12,50 L 12,38 Q 12,12 38,12 Z',
  vbW: 144,
  vbH: 120,
  w: 120,
  h: 64,
  stopsLight: ['#DAAB8C', '#C79172'],
  stopsDark: ['#80584A', '#69463A'],
  lineLight: 'rgba(255,252,246,0.50)',
  lineDark: 'rgba(244,236,223,0.20)',
};

const FLOOD_LIGHT = '#785434';
const FLOOD_DARK = '#000000';

type Props = {
  /** Unique per-instance suffix for the gradient/filter ids (must be unique across a screen). */
  id: string;
  preset: BubblePreset;
  dark: boolean;
  left: number;
  top: number;
  rotateDeg: number;
  /** Widths (px) of the soft placeholder text lines inside the bubble. */
  lineWidths: number[];
  delayMs: number;
  reduceMotion: boolean;
};

export function WarmBubble({ id, preset, dark, left, top, rotateDeg, lineWidths, delayMs, reduceMotion }: Props) {
  const stops = dark ? preset.stopsDark : preset.stopsLight;
  const lineColor = dark ? preset.lineDark : preset.lineLight;
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
    transform: [{ translateY: (1 - progress.value) * 16 }, { scale: 0.95 + progress.value * 0.05 }],
  }));

  return (
    <Animated.View style={[styles.wrap, { left, top, width: preset.w, height: preset.h }, style]}>
      <View style={[styles.inner, { transform: [{ rotate: `${rotateDeg}deg` }] }]}>
        <Svg
          width={preset.vbW}
          height={preset.vbH}
          viewBox={`0 0 ${preset.vbW} ${preset.vbH}`}
          style={[styles.art, { left: -12, top: -12 }]}
        >
          <Defs>
            <LinearGradient id={`bg-${id}`} x1="0" y1="0" x2="0.3" y2="1">
              <Stop offset="0" stopColor={stops[0]} />
              <Stop offset="1" stopColor={stops[1]} />
            </LinearGradient>
            <Filter id={`sh-${id}`} x="-40%" y="-30%" width="180%" height="190%">
              <FeDropShadow dx={0} dy={8} stdDeviation={7} floodColor={flood} floodOpacity={dark ? 0.34 : 0.14} />
            </Filter>
          </Defs>
          <Path d={preset.bodyPath} fill={`url(#bg-${id})`} filter={`url(#sh-${id})`} />
        </Svg>
        <View style={styles.lines}>
          {lineWidths.map((w, i) => (
            <View key={i} style={[styles.line, { width: w, backgroundColor: lineColor }]} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute' },
  inner: { width: '100%', height: '100%', position: 'relative' },
  art: { position: 'absolute' },
  lines: { position: 'relative', height: '100%', paddingHorizontal: 24, justifyContent: 'center', gap: 10 },
  line: { height: 7, borderRadius: 4 },
});
