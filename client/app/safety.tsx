// Safety center — how Aura keeps conversations safe + crisis resources. Supportive, grounding tone
// (never alarming). Reuses the shared CrisisSupport block. Replaces the cosmic safety screen.
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrisisSupport } from '@/components/CrisisSupport';
import { TopBar } from '@/components/TopBar';
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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <TopBar title="Safety center" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headline, { color: colors.textPrimary }]}>{withAppName(SAFETY.headline)}</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{SAFETY.moderationTitle}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{withAppName(SAFETY.moderation)}</Text>
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{SAFETY.disclosureTitle}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{SAFETY.disclosure}</Text>
        </View>

        <View style={styles.spacer} />
        <CrisisSupport companion={companion} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Full-height scroll viewport even when under-filled — otherwise the area
  // below short content is dead to swipes (same fix as companions.tsx).
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: SPACE.md, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
  headline: { ...TYPE.title, marginBottom: SPACE.xs },
  section: { gap: SPACE.xs },
  sectionTitle: { ...TYPE.label },
  body: { ...TYPE.body },
  spacer: { height: SPACE.sm },
});
