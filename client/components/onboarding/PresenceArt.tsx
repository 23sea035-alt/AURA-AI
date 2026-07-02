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
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Circle, Mask, Rect, G } from 'react-native-svg';

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

type Props = { dark: boolean; reduceMotion: boolean };

export function PresenceArt({ dark, reduceMotion }: Props) {
  const sunStops = dark ? SUN_STOPS_DARK : SUN_STOPS_LIGHT;
  const moonStops = dark ? MOON_STOPS_DARK : MOON_STOPS_LIGHT;
  const starColor = dark ? STAR_DARK : STAR_LIGHT;
  const flood = dark ? FLOOD_DARK : FLOOD_LIGHT;

  // soft completion haptic as the day/night cue settles. The carousel screen only ever mounts the
  // current slide, so mount IS "just became active" — no active/playKey gate.
  useEffect(() => {
    const t = setTimeout(() => impact(ImpactFeedbackStyle.Light), reduceMotion ? 80 : 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sunIn = useSharedValue(reduceMotion ? 1 : 0);
  const moonIn = useSharedValue(reduceMotion ? 1 : 0);
  const sunDrift = useSharedValue(0);
  const moonDrift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
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
  }, []);

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
      {/* SUN — upper-left, soft muted-gold disc (no rays). The soft shadow beneath it is a plain
          radial-gradient blob fading to transparent, NOT an FeDropShadow filter: react-native-svg
          rasterizes the filter into a buffer sized to the SVG's own declared width/height, clipping
          anything painted beyond it — "overflow: visible" only affects how the already-rasterized
          bitmap composites into the parent, not the rasterization itself. Same reason the plain
          gradient version still needed fixing: the shadow circle's radius (22) exceeded the old
          34x34 canvas, so it got hard-clipped at that boundary before it had fully faded out. The
          canvas is now sized with enough margin that every shape fully fades (or, for the sun,
          finishes painting) before it ever reaches the edge. */}
      <Animated.View style={[styles.sunWrap, sunStyle]}>
        <Svg width={60} height={60} viewBox="0 0 60 60" style={styles.overflowVisible}>
          <Defs>
            <RadialGradient id="sun-presence" fx="36%" fy="30%" cx="50%" cy="50%" r="65%">
              <Stop offset="0" stopColor={sunStops[0]} />
              <Stop offset="1" stopColor={sunStops[1]} />
            </RadialGradient>
            <RadialGradient id="suns-presence" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={flood} stopOpacity={dark ? 0.22 : 0.13} />
              <Stop offset="0.7" stopColor={flood} stopOpacity={dark ? 0.22 : 0.13} />
              <Stop offset="1" stopColor={flood} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={30} cy={34} r={18} fill="url(#suns-presence)" />
          <Circle cx={30} cy={30} r={14} fill="url(#sun-presence)" />
        </Svg>
      </Animated.View>

      {/* MOON — upper-right, warm taupe crescent (mask trick) + a tiny star. Same gradient-blob
          shadow treatment as the sun, for the same reason (no filter-buffer edge to leak), and the
          same enlarged-canvas margin so the shadow fully fades before the SVG's own bounds. */}
      <Animated.View style={[styles.moonWrap, moonStyle]}>
        <Svg width={50} height={50} viewBox="0 0 50 50" style={styles.overflowVisible}>
          <Defs>
            <Mask id="mm-presence">
              <Rect width={50} height={50} fill="black" />
              <Circle cx={25} cy={25} r={15.5} fill="white" />
              <Circle cx={31} cy={19.5} r={13} fill="black" />
            </Mask>
            <LinearGradient id="mg-presence" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor={moonStops[0]} />
              <Stop offset="1" stopColor={moonStops[1]} />
            </LinearGradient>
            <RadialGradient id="ms-presence" cx="50%" cy="50%" r="60%">
              <Stop offset="0" stopColor={flood} stopOpacity={dark ? 0.2 : 0.09} />
              <Stop offset="0.7" stopColor={flood} stopOpacity={dark ? 0.2 : 0.09} />
              <Stop offset="1" stopColor={flood} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {/* the shadow is masked to the SAME crescent (just shifted down), not a plain circle —
              a plain circle would show through the crescent's own cutout as a ghostly full moon */}
          <G transform="translate(0, 3)">
            <Rect width={50} height={50} fill="url(#ms-presence)" mask="url(#mm-presence)" />
          </G>
          <G>
            <Rect width={50} height={50} fill="url(#mg-presence)" mask="url(#mm-presence)" />
          </G>
        </Svg>
        <View style={[styles.star, { backgroundColor: starColor }]} />
      </Animated.View>

      {/* BUBBLE — centered, the steady constant (companion sand tone, tail bottom-left) */}
      <WarmBubble
        id="presence"
        preset={COMPANION_BUBBLE}
        dark={dark}
        left={84}
        top={80}
        rotateDeg={-1}
        lineWidths={[82, 54]}
        delayMs={150}
        reduceMotion={reduceMotion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 320, height: 200, position: 'relative' },
  // left/top shifted by -(newSize - 34)/2 from the original 34x34 placement, so enlarging the
  // canvas (for shadow headroom, see above) doesn't move the sun/moon's on-screen position.
  sunWrap: { position: 'absolute', left: 31, top: 37, width: 60, height: 60 },
  moonWrap: { position: 'absolute', left: 238, top: 38, width: 50, height: 50 },
  overflowVisible: { overflow: 'visible' },
  star: { position: 'absolute', right: 5, top: 8, width: 4.5, height: 4.5, borderRadius: 2.25, opacity: 0.9 },
});
