// Third-party AI consent — Apple 5.1.2(i). A dedicated, unbundled consent
// moment: plain language about AI providers processing messages (generation,
// moderation, voice), a link to the Privacy Policy's processor list, and an
// affirmative checkbox that is NOT the AI-nature acknowledgment and NOT the
// Terms accept. Gates the first chat; captured with a timestamp
// (users.thirdPartyAiConsentAt) so it's auditable.
// Spec: docs/compliance/apple-third-party-ai-consent.md.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Checkbox } from '@/components/Checkbox';
import { PressableScale, enterUp } from '@/components/motion';
import { ONBOARDING, withAppName } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

const ROW_ICONS: React.ComponentProps<typeof Ionicons>['name'][] = [
  'chatbubble-outline',
  'shield-checkmark-outline',
  'mic-outline',
];

export default function AiConsentScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { updateUser } = useApp();
  const [agreed, setAgreed] = useState(false);
  const copy = ONBOARDING.aiConsent;

  const handleContinue = () => {
    // The auditable consent capture — becomes users.thirdPartyAiConsentAt.
    updateUser({ thirdPartyAiConsentAt: new Date().toISOString() });
    router.push('/profile');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Animated.Text entering={enterUp(0)} style={[styles.title, { color: colors.textPrimary }]}>
          {copy.title}
        </Animated.Text>
        <Animated.Text entering={enterUp(1)} style={[styles.body, { color: colors.textSecondary }]}>
          {copy.body}
        </Animated.Text>

        <Animated.View entering={enterUp(2)}>
          <Card variant="soft">
            <View style={styles.rows}>
              {copy.rows.map((row, i) => (
                <View key={row.head} style={styles.row}>
                  <View style={[styles.glyph, { backgroundColor: colors.bg }]}>
                    <Ionicons name={ROW_ICONS[i]} size={18} color={colors.textSecondary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowHead, { color: colors.textPrimary }]}>{row.head}</Text>
                    <Text style={[styles.rowBody, { color: colors.textSecondary }]}>{row.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Privacy Policy §4 ("Third parties we share information with") one tap away. */}
        <Animated.View entering={enterUp(3)}>
          <PressableScale haptic="light" onPress={() => router.push('/privacy')} style={styles.link}>
            <Text style={[styles.linkText, { color: colors.accent }]}>{copy.privacyLink}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.accent} />
          </PressableScale>
        </Animated.View>

        <Animated.View entering={enterUp(4)} style={styles.consentRow}>
          <Checkbox checked={agreed} onToggle={() => setAgreed((v) => !v)} />
          <Text style={[styles.consentText, { color: colors.textSecondary }]} onPress={() => setAgreed((v) => !v)}>
            {withAppName(copy.consent)}
          </Text>
        </Animated.View>

        <Animated.View entering={enterUp(5)} style={styles.action}>
          <Button label={copy.cta} onPress={handleContinue} disabled={!agreed} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { gap: SPACE.md, paddingTop: SPACE.sm },
  title: { ...TYPE.headline, marginBottom: SPACE.xs },
  body: { ...TYPE.body, fontSize: 15, lineHeight: 22 },
  rows: { gap: SPACE.lg },
  row: { flexDirection: 'row', gap: SPACE.md, alignItems: 'flex-start' },
  glyph: { width: 36, height: 36, borderRadius: RADIUS.soft, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowHead: { fontFamily: FONTS.body.semibold, fontSize: 15 },
  rowBody: { fontFamily: FONTS.body.regular, fontSize: 14, lineHeight: 19 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingVertical: SPACE.xs },
  linkText: { fontFamily: FONTS.body.semibold, fontSize: 14 },
  consentRow: { flexDirection: 'row', gap: SPACE.sm, alignItems: 'center', marginTop: SPACE.sm },
  consentText: { flex: 1, fontFamily: FONTS.body.regular, fontSize: 14, lineHeight: 19 },
  action: { marginTop: SPACE.md },
});
