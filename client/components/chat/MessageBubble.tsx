// A single chat bubble. Companion (left): warm-paper sheet + soft shadow, softened asymmetric
// radius. User (right): wine-tinted bubble. Hanken inside, capped ~82% width for a comfy measure.
// A dictated/voice message also shows a VoiceNote (play + scrubber) above its transcript.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { VoiceNote } from '@/components/chat/VoiceNote';
import { FONTS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  text: string;
  audioUri?: string;
  /** When set, long-pressing the bubble fires this (used to open the report sheet on AI messages). */
  onLongPress?: () => void;
}

export function MessageBubble({ role, text, audioUri, onLongPress }: MessageBubbleProps) {
  const { colors, shadows } = useTheme();
  const isUser = role === 'user';
  const bubbleStyle = [
    styles.bubble,
    isUser
      ? { backgroundColor: colors.bubbleBg, borderBottomRightRadius: 6 }
      : { backgroundColor: colors.sheet, borderBottomLeftRadius: 6, ...shadows.e1 },
  ];
  const content = (
    <>
      {audioUri ? (
        <VoiceNote
          uri={audioUri}
          tint={isUser ? colors.bubbleText : colors.accent}
          trackColor={isUser ? `${colors.bubbleText}33` : colors.divider}
        />
      ) : null}
      <Text style={[styles.text, { color: isUser ? colors.bubbleText : colors.textPrimary }]}>{text}</Text>
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
    borderRadius: 18,
  },
  text: { fontFamily: FONTS.body.regular, fontSize: 16, lineHeight: 23 },
});
