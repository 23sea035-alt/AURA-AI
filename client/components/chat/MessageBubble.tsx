// A single chat bubble. Companion (left): warm-paper sheet + soft shadow, softened asymmetric
// radius. User (right): wine-tinted bubble. Hanken at the approved chat measure (TYPE.body),
// capped ~82% width. A dictated/voice message also shows a VoiceNote (play + scrubber) above its
// transcript. `reveal` hands the text to RevealingText — the newest assistant turn writes itself in.
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
  /** When set, long-pressing the bubble fires this (used to open the report sheet on AI messages). */
  onLongPress?: () => void;
  /** Word-by-word typing reveal (the newest assistant reply only). */
  reveal?: boolean;
  onRevealProgress?: () => void;
  onRevealDone?: () => void;
}

export function MessageBubble({
  role,
  text,
  audioUri,
  onLongPress,
  reveal,
  onRevealProgress,
  onRevealDone,
}: MessageBubbleProps) {
  const { colors, shadows } = useTheme();
  const isUser = role === 'user';
  const bubbleStyle = [
    styles.bubble,
    isUser
      ? { backgroundColor: colors.bubbleBg, borderBottomRightRadius: RADIUS.tight }
      : { backgroundColor: colors.sheet, borderBottomLeftRadius: RADIUS.tight, ...shadows.e1 },
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
        <RevealingText text={text} style={textStyle} onProgress={onRevealProgress} onDone={onRevealDone} />
      ) : (
        <Text style={textStyle}>{text}</Text>
      )}
    </>
  );
  return (
    <View style={[styles.row, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
      {onLongPress ? (
        <Pressable onLongPress={onLongPress} delayLongPress={350} style={bubbleStyle}>
          {content}
        </Pressable>
      ) : (
        <View style={bubbleStyle}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: SPACE.xs },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.card,
  },
  text: { ...TYPE.body },
});
