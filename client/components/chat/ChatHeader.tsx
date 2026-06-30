// Chat header — back chevron, the companion avatar (header only, never per-bubble), the name
// with the persistent honest "AI companion" marker, and an overflow. Built in onboarding's
// first conversation, reused by the Chat one-off.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { PressableScale } from '@/components/motion';
import { CHAT } from '@/constants/content';
import { FONTS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface ChatHeaderProps {
  id: string;
  name: string;
  onBack: () => void;
  onOverflow?: () => void;
}

export function ChatHeader({ id, name, onBack, onOverflow }: ChatHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: colors.divider }]}>
      <PressableScale onPress={onBack} hitSlop={8} haptic="light" style={styles.iconBtn}>
        <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
      </PressableScale>
      <Avatar id={id} name={name} size={38} />
      <View style={styles.titleArea}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.marker, { color: colors.textTertiary }]}>{CHAT.aiMarker}</Text>
      </View>
      <PressableScale onPress={onOverflow} hitSlop={8} haptic="light" style={styles.iconBtn}>
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    paddingBottom: SPACE.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: 4 },
  titleArea: { flex: 1 },
  name: { fontFamily: FONTS.display.semibold, fontSize: 18 },
  marker: { fontFamily: FONTS.body.medium, fontSize: 12 },
});
