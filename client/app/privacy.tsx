// Privacy / legal — a calm reading layout: a plain-language retention summary card above the formal
// (sectioned) policy text + a link to full Terms. Utility, still, ink-on-paper (no accent flourish).
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { LEGAL } from '@/constants/content';
import { DEMO } from '@/constants/demo';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function PrivacyScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { companions } = useApp();
  const companion = companions[0]?.name ?? DEMO.primaryCompanion;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{LEGAL.title}</Text>

        <View style={[styles.summary, { backgroundColor: colors.raised, borderColor: colors.border }]}>
          <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
            {LEGAL.retentionSummary.replace('{Companion}', companion)}
          </Text>
        </View>

        {LEGAL.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionHead, { color: colors.textPrimary }]}>{section.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{section.body}</Text>
          </View>
        ))}

        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>{LEGAL.lastUpdated}</Text>

        <ListGroup>
          <ListRow first label={LEGAL.fullTerms} onPress={() => {}} />
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { gap: SPACE.md },
  title: { ...TYPE.headline, marginBottom: SPACE.xs },
  summary: {
    borderRadius: RADIUS.edit,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.lg,
    marginBottom: SPACE.sm,
  },
  summaryText: { fontFamily: FONTS.body.medium, fontSize: 15, lineHeight: 22 },
  section: { gap: SPACE.xs },
  sectionHead: { fontFamily: FONTS.display.semibold, fontSize: 18, marginTop: SPACE.sm },
  body: { ...TYPE.body },
  lastUpdated: { ...TYPE.caption, marginTop: SPACE.xs },
});
