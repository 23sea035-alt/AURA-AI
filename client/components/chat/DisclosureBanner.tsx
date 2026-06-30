// Quiet, dismissible first-session AI-disclosure banner pinned above the thread.
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressableScale } from '@/components/motion';
import { FONTS, RADIUS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export function DisclosureBanner({ text }: { text: string }) {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <View style={[styles.banner, { backgroundColor: colors.accentTint }]}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>{text}</Text>
      <PressableScale onPress={() => setDismissed(true)} hitSlop={8} haptic="light">
        <Ionicons name="close" size={16} color={colors.textTertiary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.soft,
    marginBottom: SPACE.md,
  },
  text: { flex: 1, fontFamily: FONTS.body.regular, fontSize: 13, lineHeight: 18 },
});
