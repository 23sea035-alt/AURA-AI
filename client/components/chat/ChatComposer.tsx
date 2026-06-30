// Input dock — a structural surface (warm hairline + soft radius). Hold the mic to dictate: a
// recording bar with a live level meter appears and the partial transcript streams into the field as
// you speak. Slide the held mic left past the threshold to cancel (discard); release to commit. The
// send affordance replaces the mic once the field is non-empty. Soft haptics mark start/commit/cancel.
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { LevelMeter } from '@/components/chat/LevelMeter';
import { TextField } from '@/components/TextField';
import { PressableScale } from '@/components/motion';
import { FONTS, RADIUS, SPACE } from '@/constants/design';
import { useDictation } from '@/hooks/useDictation';
import { useTheme } from '@/hooks/useTheme';

const CANCEL_X = -90; // slide the mic this far left (px) to cancel

interface ChatComposerProps {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  placeholder?: string;
  // Fired when a hold-to-talk dictation commits, so the parent can tag the next send as voice-origin.
  onVoiceResult?: (info: { audioUri?: string }) => void;
}

export function ChatComposer({ value, onChangeText, onSend, placeholder, onVoiceResult }: ChatComposerProps) {
  const { colors } = useTheme();
  const canSend = value.trim().length > 0;
  const baseRef = useRef('');
  const willCancelRef = useRef(false);
  const [willCancel, setWillCancel] = useState(false);
  const dragX = useSharedValue(0);

  const { listening, level, start, stop, cancel } = useDictation({
    onPartial: (transcript) =>
      onChangeText(baseRef.current ? `${baseRef.current} ${transcript}` : transcript),
    onFinal: ({ audioUri }) => onVoiceResult?.({ audioUri }),
    onCancel: () => onChangeText(baseRef.current), // revert the field to its pre-dictation text
  });

  const beginDictation = () => {
    baseRef.current = value.trim();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    start();
  };

  const updateWillCancel = (next: boolean) => {
    if (next === willCancelRef.current) return;
    willCancelRef.current = next;
    setWillCancel(next);
    if (next) void Haptics.selectionAsync(); // tick when crossing into the cancel zone
  };

  const finishGesture = (didCancel: boolean) => {
    willCancelRef.current = false;
    setWillCancel(false);
    if (didCancel) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      cancel();
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      stop();
    }
  };

  const pan = Gesture.Pan()
    .shouldCancelWhenOutside(false)
    .onBegin(() => {
      runOnJS(beginDictation)();
    })
    .onUpdate((e) => {
      dragX.value = Math.min(0, e.translationX);
      runOnJS(updateWillCancel)(e.translationX < CANCEL_X);
    })
    .onFinalize((e) => {
      dragX.value = withSpring(0);
      runOnJS(finishGesture)(e.translationX < CANCEL_X);
    });

  const micStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dragX.value }] }));

  return (
    <View style={styles.wrap}>
      {listening ? (
        <View style={[styles.recBar, { backgroundColor: colors.raised, borderColor: willCancel ? colors.error : colors.border }]}>
          {willCancel ? (
            <>
              <Ionicons name="trash" size={16} color={colors.error} />
              <Text style={[styles.recLabel, { color: colors.error }]}>Release to cancel</Text>
            </>
          ) : (
            <>
              <View style={[styles.dot, { backgroundColor: colors.error, opacity: 0.55 + level * 0.45 }]} />
              <LevelMeter level={level} active={listening} color={colors.accent} />
              <Text style={[styles.hint, { color: colors.textTertiary }]}>‹ slide to cancel</Text>
            </>
          )}
        </View>
      ) : null}

      <View style={[styles.dock, { borderColor: colors.border, backgroundColor: colors.raised }]}>
        <TextField
          value={value}
          onChangeText={onChangeText}
          placeholder={listening ? 'Listening…' : placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[styles.input, { color: colors.textPrimary }]}
        />
        {canSend ? (
          <PressableScale onPress={onSend} haptic="light" style={[styles.btn, { backgroundColor: colors.accent }]}>
            <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
          </PressableScale>
        ) : (
          <GestureDetector gesture={pan}>
            <Animated.View
              accessibilityRole="button"
              accessibilityLabel="Hold to dictate a voice message; slide left to cancel"
              style={[
                styles.btn,
                micStyle,
                listening
                  ? { backgroundColor: willCancel ? colors.error : colors.accent }
                  : { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name={willCancel ? 'trash' : listening ? 'mic' : 'mic-outline'}
                size={20}
                color={listening ? colors.onAccent : colors.textSecondary}
              />
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACE.xs },
  recBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    borderWidth: 1,
    borderRadius: RADIUS.soft,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  recLabel: { fontFamily: FONTS.body.medium, fontSize: 13 },
  hint: { fontFamily: FONTS.body.regular, fontSize: 11 },
  dock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACE.sm,
    borderWidth: 1,
    borderRadius: RADIUS.soft,
    paddingLeft: SPACE.md,
    paddingRight: SPACE.xs,
    paddingVertical: SPACE.xs,
    minHeight: 48,
  },
  input: { flex: 1, fontFamily: FONTS.body.regular, fontSize: 16, paddingVertical: SPACE.sm, maxHeight: 120 },
  btn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});
