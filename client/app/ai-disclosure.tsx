// AI disclosure + ToS — the honesty moment, warm not legalistic. Title + three short human
// cards (the "heavy" one uses the calm crisis token, never alarm-red) + a genuine consent
// checkbox gating Continue. Replaces the cosmic glass/particle disclosure.
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
import { enterUp } from '@/components/motion';
import { ONBOARDING } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

const CARD_ICONS: React.ComponentProps<typeof Ionicons>['name'][] = [
  'sparkles-outline',
  'heart-outline',
  'lock-closed-outline',
];

export default function AIDisclosureScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { updateUser } = useApp();
  const [agreed, setAgreed] = useState(false);
  const copy = ONBOARDING.disclosure;

  const handleContinue = () => {
    updateUser({ aiDisclosureAccepted: true });
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

        {copy.cards.map((card, i) => {
          const isCrisis = i === 1;
          return (
            <Animated.View key={card.head} entering={enterUp(i + 1)}>
              <Card variant="soft">
                <View style={styles.cardRow}>
                  <View
                    style={[
                      styles.glyph,
                      { backgroundColor: isCrisis ? colors.crisisBg : colors.accentTint },
                    ]}
                  >
                    <Ionicons name={CARD_ICONS[i]} size={20} color={isCrisis ? colors.crisis : colors.accent} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={[styles.cardHead, { color: colors.textPrimary }]}>{card.head}</Text>
                    <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{card.body}</Text>
                  </View>
                </View>
              </Card>
            </Animated.View>
          );
        })}

        <Animated.View entering={enterUp(4)} style={styles.consentRow}>
          <Checkbox checked={agreed} onToggle={() => setAgreed((v) => !v)} />
          <Text style={[styles.consentText, { color: colors.textSecondary }]} onPress={() => setAgreed((v) => !v)}>
            {copy.consent}
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
  cardRow: { flexDirection: 'row', gap: SPACE.md, alignItems: 'flex-start' },
  glyph: { width: 40, height: 40, borderRadius: RADIUS.soft, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: 2 },
  cardHead: { fontFamily: FONTS.body.semibold, fontSize: 16 },
  cardBody: { fontFamily: FONTS.body.regular, fontSize: 15, lineHeight: 21 },
  consentRow: { flexDirection: 'row', gap: SPACE.sm, alignItems: 'center', marginTop: SPACE.sm },
  consentText: { flex: 1, fontFamily: FONTS.body.regular, fontSize: 14, lineHeight: 19 },
  action: { marginTop: SPACE.md },
});
