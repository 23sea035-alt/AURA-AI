// Transient bottom toast — fades in, dwells, fades out, then calls onHide. Adapted from
// Amibroke to Aura's theme (warm raised surface + soft shadow). Honors reduce-motion.
import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { FONTS, SPACE, RADIUS } from '@/constants/design';
import { DURATION } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';

interface ToastProps {
  message: string;
  emoji?: string;
  visible: boolean;
  duration?: number;
  onHide?: () => void;
}

export function Toast({ message, emoji, visible, duration = 2500, onHide }: ToastProps) {
  const { colors, shadows } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const reduce = useReducedMotion();

  useEffect(() => {
    if (visible) {
      if (reduce) {
        // Reduce Motion: appear instantly, auto-dismiss after the dwell (no fade).
        opacity.setValue(1);
        const t = setTimeout(() => onHide?.(), duration);
        return () => clearTimeout(t);
      }
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: DURATION.normal, useNativeDriver: true }),
        Animated.delay(duration),
        Animated.timing(opacity, { toValue: 0, duration: DURATION.normal, useNativeDriver: true }),
      ]).start(() => onHide?.());
    } else {
      opacity.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.raised, borderColor: colors.border, ...shadows.e2, opacity },
      ]}
    >
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={[styles.text, { color: colors.textPrimary }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: SPACE.xl,
    right: SPACE.xl,
    borderRadius: RADIUS.card,
    padding: SPACE.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emoji: { fontSize: 17 },
  text: { flex: 1, fontFamily: FONTS.body.medium, fontSize: 15 },
});
