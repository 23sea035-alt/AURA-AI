// Terms of Service — the full, formal document, on its own (Privacy Policy
// lives at /privacy). Condensed from docs/compliance/terms-of-service-draft.md.
// Calm reading layout, ink-on-paper (no accent flourish).
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TopBar } from '@/components/TopBar';
import { TERMS_OF_SERVICE, withAppName } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export default function TermsOfServiceScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <TopBar title="Terms of service" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.docTitle, { color: colors.textPrimary }]}>{withAppName(TERMS_OF_SERVICE.title)}</Text>
        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>{TERMS_OF_SERVICE.lastUpdated}</Text>
        {TERMS_OF_SERVICE.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionHead, { color: colors.textPrimary }]}>{withAppName(section.title)}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{withAppName(section.body)}</Text>
          </View>
        ))}
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
  docTitle: { ...TYPE.headline },
  lastUpdated: { ...TYPE.caption, marginTop: -SPACE.sm },
  section: { gap: SPACE.xs, marginTop: SPACE.sm },
  sectionHead: { fontFamily: FONTS.display.semibold, fontSize: 18 },
  body: { ...TYPE.body },
});
