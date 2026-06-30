// Safety center — how Aura keeps conversations safe + crisis resources. Supportive, grounding tone
// (never alarming). Reuses the shared CrisisSupport block. Replaces the cosmic safety screen.
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { CrisisSupport } from '@/components/CrisisSupport';
import { SAFETY, withAppName } from '@/constants/content';
import { SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function SafetyScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { companions } = useApp();
  const companion = companions[0]?.name ?? 'Aurora';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Safety center</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{withAppName(SAFETY.moderation)}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{SAFETY.disclosure}</Text>
        <View style={styles.spacer} />
        <CrisisSupport companion={companion} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { gap: SPACE.md },
  title: { ...TYPE.headline, marginBottom: SPACE.xs },
  body: { ...TYPE.body },
  spacer: { height: SPACE.sm },
});
