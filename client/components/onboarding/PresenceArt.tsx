// Slide 3 hero — "here whenever you need." One steady companion bubble (same warm-sand register
// as ChatArt's companion bubble — deliberately shared) present through day & night: a small soft
// sun flanks the upper-left, a warm crescent moon the upper-right. The bubble is the constant
// hero; sun/moon are small, secondary context — no radiating rays (not a wifi/signal motif), no
// cold blue, warm in both themes. Calmest slide: the bubble settles, then sun+moon fade in and
// drift in a slow, gentle, opposite-phase idle loop (the only slide with a continuous idle
// animation — gated off when not `active` so it isn't running on an off-screen slide). Ported
// from docs/redesign/claude-design/onboarding-app.jsx PresenceArt.
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Filter,
  FeDropShadow,
  Circle,
  Mask,
  Rect,
  G,
} from 'react-native-svg';

import { DURATION, EASING } from '@/constants/motion';
import { impact, ImpactFeedbackStyle } from '@/utils/haptics';

import { COMPANION_BUBBLE, WarmBubble } from './WarmBubble';

const SUN_STOPS_LIGHT: [string, string] = ['#EDC074', '#D6A24E'];
const SUN_STOPS_DARK: [string, string] = ['#DEA64C', '#C2883A'];
const MOON_STOPS_LIGHT: [string, string] = ['#C99E80', '#AE7F62'];
const MOON_STOPS_DARK: [string, string] = ['#9A7560', '#7C5A47'];
const STAR_LIGHT = '#D6A24E';
const STAR_DARK = '#E6C68C';
const FLOOD_LIGHT = '#785434';
const FLOOD_DARK = '#000000';

type Props = { dark: boolean; playKey: number; active: boolean; reduceMotion: boolean };

export function PresenceArt({ dark, playKey, active, reduceMotion }: Props) {
  const sunStops = dark ? SUN_STOPS_DARK : SUN_STOPS_LIGHT;
  const moonStops = dark ? MOON_STOPS_DARK : MOON_STOPS_LIGHT;
  const starColor = dark ? STAR_DARK : STAR_LIGHT;
  const flood = dark ? FLOOD_DARK : FLOOD_LIGHT;

  // soft completion haptic as the day/night cue settles
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => impact(ImpactFeedbackStyle.Light), reduceMotion ? 80 : 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, playKey]);

  const sunIn = useSharedValue(reduceMotion || !active ? 1 : 0);
  const moonIn = useSharedValue(reduceMotion || !active ? 1 : 0);
  const sunDrift = useSharedValue(0);
  const moonDrift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || !active) {
      sunIn.value = 1;
      moonIn.value = 1;
      sunDrift.value = 0;
      moonDrift.value = 0;
      return;
    }
    sunIn.value = 0;
    moonIn.value = 0;
    sunIn.value = withDelay(600, withTiming(1, { duration: DURATION.normal }));
    moonIn.value = withDelay(720, withTiming(1, { duration: DURATION.normal }));
    // sun sinks while the moon floats — a slow, gentle counter-phase drift once each has landed.
    sunDrift.value = withDelay(
      1300,
      withRepeat(
        withSequence(
          withTiming(4, { duration: DURATION.ambient / 2, easing: EASING.ambient }),
          withTiming(0, { duration: DURATION.ambient / 2, easing: EASING.ambient }),
        ),
        -1,
        true,
      ),
    );
    moonDrift.value = withDelay(
      1300,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: DURATION.ambient / 2, easing: EASING.ambient }),
          withTiming(0, { duration: DURATION.ambient / 2, easing: EASING.ambient }),
        ),
        -1,
        true,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey, active]);

  const sunStyle = useAnimatedStyle(() => ({
    opacity: sunIn.value,
    transform: [{ translateY: sunDrift.value }],
  }));
  const moonStyle = useAnimatedStyle(() => ({
    opacity: moonIn.value,
    transform: [{ translateY: moonDrift.value }],
  }));

  return (
    <View style={styles.stage}>
      {/* SUN — upper-left, soft muted-gold disc (no rays) */}
      <Animated.View style={[styles.sunWrap, sunStyle]}>
        <Svg width={34} height={34} viewBox="0 0 34 34" style={styles.overflowVisible}>
          <Defs>
            <RadialGradient id={`sun-${playKey}`} fx="36%" fy="30%" cx="50%" cy="50%" r="65%">
              <Stop offset="0" stopColor={sunStops[0]} />
              <Stop offset="1" stopColor={sunStops[1]} />
            </RadialGradient>
            <Filter id={`suns-${playKey}`} x="-50%" y="-50%" width="200%" height="200%">
              <FeDropShadow dx={0} dy={5} stdDeviation={4} floodColor={flood} floodOpacity={dark ? 0.42 : 0.26} />
            </Filter>
          </Defs>
          <Circle cx={17} cy={17} r={17} fill={`url(#sun-${playKey})`} filter={`url(#suns-${playKey})`} />
        </Svg>
      </Animated.View>

      {/* MOON — upper-right, warm taupe crescent (mask trick) + a tiny star */}
      <Animated.View style={[styles.moonWrap, moonStyle]}>
        <Svg width={34} height={34} viewBox="0 0 34 34" style={styles.overflowVisible}>
          <Defs>
            <Mask id={`mm-${playKey}`}>
              <Rect width={34} height={34} fill="black" />
              <Circle cx={17} cy={17} r={15.5} fill="white" />
              <Circle cx={23} cy={11.5} r={13} fill="black" />
            </Mask>
            <LinearGradient id={`mg-${playKey}`} x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor={moonStops[0]} />
              <Stop offset="1" stopColor={moonStops[1]} />
            </LinearGradient>
            <Filter id={`ms-${playKey}`} x="-50%" y="-50%" width="200%" height="200%">
              <FeDropShadow dx={0} dy={3} stdDeviation={3} floodColor={flood} floodOpacity={dark ? 0.4 : 0.18} />
            </Filter>
          </Defs>
          <G filter={`url(#ms-${playKey})`}>
            <Rect width={34} height={34} fill={`url(#mg-${playKey})`} mask={`url(#mm-${playKey})`} />
          </G>
        </Svg>
        <View style={[styles.star, { backgroundColor: starColor }]} />
      </Animated.View>

      {/* BUBBLE — centered, the steady constant (companion sand tone, tail bottom-left) */}
      <WarmBubble
        id={`presence-${playKey}`}
        preset={COMPANION_BUBBLE}
        dark={dark}
        left={84}
        top={80}
        rotateDeg={-1}
        lineWidths={[82, 54]}
        delayMs={150}
        playKey={playKey}
        active={active}
        reduceMotion={reduceMotion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 320, height: 200, position: 'relative' },
  sunWrap: { position: 'absolute', left: 44, top: 50, width: 34, height: 34 },
  moonWrap: { position: 'absolute', left: 246, top: 46, width: 34, height: 34 },
  overflowVisible: { overflow: 'visible' },
  star: { position: 'absolute', right: -3, top: 0, width: 4.5, height: 4.5, borderRadius: 2.25, opacity: 0.9 },
});
