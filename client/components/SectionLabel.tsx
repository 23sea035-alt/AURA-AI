// All-caps section header used across list screens. One definition so they can't drift.
import React from 'react';
import { Text, StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import { FONTS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface SectionLabelProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export function SectionLabel({ children, style }: SectionLabelProps) {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.textSecondary }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: FONTS.body.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACE.sm,
  },
});
