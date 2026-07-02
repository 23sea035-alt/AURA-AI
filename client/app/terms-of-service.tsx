// Terms of Service + Privacy Policy — the full, formal legal documents. Reached from the Privacy
// screen's "Read the full Terms of Service" row and the Paywall's legal footer. Distinct from the
// Privacy screen itself, which shows a plain-language 4-section summary, not the complete text.
// Calm reading layout, ink-on-paper (no accent flourish) — matches Privacy's own doctrine.
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TopBar } from '@/components/TopBar';
import { PRIVACY_POLICY_FULL, TERMS_OF_SERVICE, withAppName } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export default function TermsOfServiceScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <TopBar title="Terms & Privacy" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.doc}>
          <Text style={[styles.docTitle, { color: colors.textPrimary }]}>{withAppName(TERMS_OF_SERVICE.title)}</Text>
          <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>{TERMS_OF_SERVICE.lastUpdated}</Text>
          {TERMS_OF_SERVICE.sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={[styles.sectionHead, { color: colors.textPrimary }]}>{withAppName(section.title)}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{withAppName(section.body)}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        <View style={styles.doc}>
          <Text style={[styles.docTitle, { color: colors.textPrimary }]}>{withAppName(PRIVACY_POLICY_FULL.title)}</Text>
          <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>{PRIVACY_POLICY_FULL.lastUpdated}</Text>
          {PRIVACY_POLICY_FULL.sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={[styles.sectionHead, { color: colors.textPrimary }]}>{withAppName(section.title)}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{withAppName(section.body)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: SPACE.xl, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
  doc: { gap: SPACE.md },
  docTitle: { ...TYPE.headline, marginBottom: -SPACE.xs },
  lastUpdated: { ...TYPE.caption },
  divider: { height: StyleSheet.hairlineWidth },
  section: { gap: SPACE.xs },
  sectionHead: { fontFamily: FONTS.display.semibold, fontSize: 18 },
  body: { ...TYPE.body },
});
