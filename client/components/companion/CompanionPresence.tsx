// The companion presence — the app's identity anchor. The hand-crafted portrait
// resting on its persona's whisper-tint disc, breathing almost imperceptibly
// (alive but calm; reduce-motion holds perfectly still). Anchors Home, the
// persona picker, the paywall hero, and the voice call. Never a glowing orb:
// depth comes from the tonal wash + soft warm shadow.
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/Avatar';
import { personaToneFor } from '@/constants/design';
import { DURATION, EASING, SCALE } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';

interface CompanionPresenceProps {
  id: string;
  name: string;
  /** Portrait diameter; the whisper-tint disc sits ~1.3× behind it. */
  size?: number;
  colorFrom?: string;
  colorTo?: string;
  /** Ambient breath on/off (default on). Utility contexts pass false. */
  breathing?: boolean;
}

export function CompanionPresence({
  id,
  name,
  size = 132,
  colorFrom,
  colorTo,
  breathing = true,
}: CompanionPresenceProps) {
  const { mode, shadows } = useTheme();
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(1);

  useEffect(() => {
    if (!breathing || reduceMotion) {
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(
      withTiming(SCALE.breath, { duration: DURATION.ambient / 2, easing: EASING.ambient }),
      -1,
      true,
    );
  }, [breathing, reduceMotion, breath]);

  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));
  const tone = personaToneFor(mode, id);
  const washSize = Math.round(size * 1.32);

  return (
    <View style={[styles.wrap, { width: washSize, height: washSize }]}>
      {tone ? (
        <View style={[StyleSheet.absoluteFill, { borderRadius: washSize / 2, backgroundColor: tone.wash }]} />
      ) : null}
      <Animated.View style={[breathStyle, shadows.e2, styles.portrait, { borderRadius: size / 2 }]}>
        <Avatar id={id} name={name} size={size} colorFrom={colorFrom} colorTo={colorTo} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  // The shadow needs an opaque backing shape to cast from (the PNG itself is transparent-edged).
  portrait: { overflow: 'visible' },
});
