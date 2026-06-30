// Degenerate-data fallback — emoji + title + body. `center` fills + vertically centers
// (full-screen use, e.g. a coming-soon stub). Adapted from Amibroke to Aura's theme.
import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { FONTS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  body: string;
  style?: StyleProp<ViewStyle>;
  center?: boolean;
}

export function EmptyState({ emoji, title, body, style, center }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, center && styles.center, style]}>
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACE.xl },
  center: { flex: 1, justifyContent: 'center', paddingTop: 0 },
  emoji: { fontSize: 48, marginBottom: SPACE.lg },
  title: { fontFamily: FONTS.display.semibold, fontSize: 20, marginBottom: SPACE.sm, textAlign: 'center' },
  body: { fontFamily: FONTS.body.regular, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
