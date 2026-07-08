// A single chat bubble. Companion (left): warm-paper sheet + soft shadow, softened asymmetric
// radius. User (right): wine-tinted bubble. Hanken at the approved chat measure (TYPE.body),
// capped ~82% width. Consecutive same-sender messages group: tighter spacing, and only the last
// bubble of a group keeps the asymmetric tail. A dictated/voice message also shows a VoiceNote
// (play + scrubber) above its transcript. `reveal` hands the text to RevealingText — the newest
// assistant turn writes itself in.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { RevealingText } from '@/components/chat/RevealingText';
import { VoiceNote } from '@/components/chat/VoiceNote';
import { RADIUS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  text: string;
  audioUri?: string;
  /** Tap (used to toggle the message's timestamp). */
  onPress?: () => void;
  /** When set, long-pressing the bubble fires this (opens the message action sheet). */
  onLongPress?: () => void;
  /** Word-by-word typing reveal (the newest assistant reply only). */
  reveal?: boolean;
  /** The reply is still streaming in — the reveal keeps its caret between chunks. */
  streaming?: boolean;
  onRevealProgress?: () => void;
  onRevealDone?: () => void;
  /** Continues a run of same-sender messages — tighter gap above. */
  grouped?: boolean;
  /** Last bubble of its group keeps the asymmetric tail (default true). */
  tail?: boolean;
}

export function MessageBubble({
  role,
  text,
  audioUri,
  onPress,
  onLongPress,
  reveal,
  streaming,
  onRevealProgress,
  onRevealDone,
  grouped,
  tail = true,
}: MessageBubbleProps) {
  const { colors, shadows } = useTheme();
  const isUser = role === 'user';
  const bubbleStyle = [
    styles.bubble,
    isUser ? { backgroundColor: colors.bubbleBg } : { backgroundColor: colors.sheet, ...shadows.e1 },
    tail && (isUser ? { borderBottomRightRadius: RADIUS.tight } : { borderBottomLeftRadius: RADIUS.tight }),
  ];
  const textStyle = [styles.text, { color: isUser ? colors.bubbleText : colors.textPrimary }];
  const content = (
    <>
      {audioUri ? (
        <VoiceNote
          uri={audioUri}
          tint={isUser ? colors.bubbleText : colors.accent}
          trackColor={isUser ? `${colors.bubbleText}33` : colors.divider}
        />
      ) : null}
      {reveal && !isUser ? (
        <RevealingText
          text={text}
          style={textStyle}
          streaming={streaming}
          onProgress={onRevealProgress}
          onDone={onRevealDone}
        />
      ) : (
        <Text style={textStyle}>{text}</Text>
      )}
    </>
  );
  return (
    <View
      style={[
        styles.row,
        { marginTop: grouped ? SPACE.xs : SPACE.lg, justifyContent: isUser ? 'flex-end' : 'flex-start' },
      ]}
    >
      {onPress || onLongPress ? (
        <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={350} style={bubbleStyle}>
          {content}
        </Pressable>
      ) : (
        <View style={bubbleStyle}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Vertical rhythm lives on marginTop: lg between exchanges, xs within a group.
  row: { flexDirection: 'row' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.card,
  },
  text: { ...TYPE.body },
});
