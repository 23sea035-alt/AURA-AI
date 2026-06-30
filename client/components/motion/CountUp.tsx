import React, { useEffect } from 'react';
import { TextInput, type TextStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  runOnJS,
  useReducedMotion,
} from 'react-native-reanimated';
import { DURATION, EASING } from '@/constants/motion';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  /** Target value to climb to. */
  value: number;
  /** Climb duration (ms). Defaults to the deliberately-long reveal token. */
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  /** Fired when the climb finishes — use for a landing haptic. */
  onDone?: () => void;
};

/**
 * Animated number that climbs 0 → `value` with an ease-out curve. Uses the
 * TextInput animatedProps trick so the digits update on the UI thread, with
 * `tabular-nums` so the width doesn't jitter mid-climb. Honors Reduce Motion
 * (snaps to the final value, still fires `onDone`).
 */
export function CountUp({ value, duration = DURATION.reveal, prefix = '', suffix = '', style, onDone }: Props) {
  const reduce = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduce) {
      progress.value = value;
      onDone?.();
      return;
    }
    progress.value = 0;
    progress.value = withTiming(value, { duration, easing: EASING.smooth }, (finished) => {
      'worklet';
      if (finished && onDone) runOnJS(onDone)();
    });
    // onDone intentionally omitted from deps — we don't want to restart the climb
    // when the parent passes a new closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reduce]);

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const n = Math.round(progress.value);
    const text = `${prefix}${n}${suffix}`;
    return { text, defaultValue: text } as object;
  });

  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      value={`${prefix}${Math.round(value)}${suffix}`}
      accessibilityLabel={`${prefix}${Math.round(value)}${suffix}`}
      style={[{ fontVariant: ['tabular-nums'], padding: 0 }, style]}
      animatedProps={animatedProps}
    />
  );
}
