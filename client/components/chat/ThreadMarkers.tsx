// Quiet in-thread markers. ThreadDivider is a serif "moment" (the doctrine
// reserves Newsreader for moments, never bubble text): a small centered date
// line that gives a long conversation its chapters. AiNotice is the recurring
// SB 243 disclosure line — honest, tertiary, unobtrusive; rendered when a turn
// arrives with the aiDisclosure flag (distinct from the first-session banner).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { FONTS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export function ThreadDivider({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.dividerRow} accessibilityRole="header">
      <View style={[styles.rule, { backgroundColor: colors.divider }]} />
      <Text style={[styles.dividerText, { color: colors.textTertiary }]}>{label}</Text>
      <View style={[styles.rule, { backgroundColor: colors.divider }]} />
    </View>
  );
}

export function AiNotice({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.notice, { color: colors.textTertiary }]} accessibilityLabel={text}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginVertical: SPACE.lg,
  },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontFamily: FONTS.display.medium, fontSize: 15, fontStyle: 'italic' },
  notice: {
    fontFamily: FONTS.body.medium,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: SPACE.xs,
    marginBottom: SPACE.sm,
  },
});
