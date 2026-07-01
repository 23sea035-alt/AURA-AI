// Slide 1 hero — "every conversation connected, nothing lost." A single continuous, thick, warm
// ribbon/thread enters softly from the left, meanders gently and roughly level, and fades off the
// right (ongoing — picks up where you left off). A few small conversation bubbles ride ON the
// thread at uneven spots + varied heights. On land the ribbon draws left-to-right (slow,
// decelerating) and each bubble settles onto it in sequence as the draw-tip passes. Ported from
// docs/redesign/claude-design/onboarding-app.jsx ThreadArt.
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Mask, LinearGradient, Stop, Rect, G, Path } from 'react-native-svg';

import { DURATION, EASING } from '@/constants/motion';
import { impact, ImpactFeedbackStyle } from '@/utils/haptics';

import { MiniBubble } from './MiniBubble';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// wider, level meander with a clear central low point; ends run off both edges
const THREAD_D = 'M -22 96 C 48 72, 94 72, 142 104 C 176 126, 200 126, 236 100 C 282 70, 318 84, 346 94';
// react-native-svg has no `pathLength` normalization (the web prototype's "100" convenience
// value) — this is THREAD_D's real length, numerically integrated, used as the actual dash length.
const THREAD_LENGTH = 389;

type Props = { dark: boolean; playKey: number; active: boolean; reduceMotion: boolean };

export function ThreadArt({ dark, playKey, active, reduceMotion }: Props) {
  const shade = dark ? '#5E3D30' : '#C08F6F'; // tonal shadow underneath the ribbon
  const sheen = dark ? 'rgba(244,236,223,0.16)' : 'rgba(255,252,246,0.55)';
  const sand = dark ? '#7A5142' : '#D8A98C'; // warm clay/sand ribbon — mirrors colors.avatar

  // soft completion haptic as the last conversation settles onto the thread
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => impact(ImpactFeedbackStyle.Light), reduceMotion ? 80 : 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, playKey]);

  // strokeDashoffset: THREAD_LENGTH = fully hidden, 0 = fully drawn
  const draw = useSharedValue(reduceMotion || !active ? 0 : THREAD_LENGTH);
  useEffect(() => {
    if (reduceMotion || !active) {
      draw.value = 0;
      return;
    }
    draw.value = THREAD_LENGTH;
    draw.value = withDelay(500, withTiming(0, { duration: DURATION.draw, easing: EASING.draw }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey, active]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: draw.value }));

  return (
    <View style={styles.stage}>
      <Svg width={320} height={200} viewBox="0 0 320 200">
        <Defs>
          {/* edges fade to transparent — thread reads as ongoing, not a bounded bar */}
          <LinearGradient id={`tg-${playKey}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#000" />
            <Stop offset="0.14" stopColor="#fff" />
            <Stop offset="0.86" stopColor="#fff" />
            <Stop offset="1" stopColor="#000" />
          </LinearGradient>
          <Mask id={`tm-${playKey}`}>
            <Rect width={320} height={200} fill={`url(#tg-${playKey})`} />
          </Mask>
        </Defs>
        <G mask={`url(#tm-${playKey})`}>
          <AnimatedPath
            d={THREAD_D}
            transform="translate(0,5)"
            stroke={shade}
            strokeWidth={24}
            strokeLinecap="round"
            fill="none"
            opacity={0.5}
            strokeDasharray={THREAD_LENGTH}
            animatedProps={animatedProps}
          />
          <AnimatedPath
            d={THREAD_D}
            stroke={sand}
            strokeWidth={24}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={THREAD_LENGTH}
            animatedProps={animatedProps}
          />
          <AnimatedPath
            d={THREAD_D}
            transform="translate(0,-5)"
            stroke={sheen}
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={THREAD_LENGTH}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
      {/* a few conversations linked along the thread — uneven spacing + varied heights, NOT
          evenly spaced (would read as a graph) */}
      <MiniBubble
        id={`a-${playKey}`}
        dark={dark}
        left={58}
        top={38}
        tailLeft
        delayMs={900}
        playKey={playKey}
        active={active}
        reduceMotion={reduceMotion}
      />
      <MiniBubble
        id={`b-${playKey}`}
        dark={dark}
        left={134}
        top={82}
        tailLeft={false}
        delayMs={1300}
        playKey={playKey}
        active={active}
        reduceMotion={reduceMotion}
      />
      <MiniBubble
        id={`c-${playKey}`}
        dark={dark}
        left={218}
        top={58}
        tailLeft
        delayMs={1700}
        playKey={playKey}
        active={active}
        reduceMotion={reduceMotion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 320, height: 200, position: 'relative' },
});
