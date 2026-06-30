// Paywall — the conversion screen, calm not celebratory. Warm headline + a single-column value
// list + a store-driven price (skeleton slot, NEVER hardcoded) + Subscribe + Restore + legal line.
// owned state (premium) shows "current plan" + Manage subscription. Replaces the cosmic premium tab.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { PressableScale, enterUp } from '@/components/motion';
import { PAYWALL, SYSTEM, withAppName } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

const RENEW_DATE = 'Jul 14, 2026'; // demo; the real app reads this from the store

export default function PaywallScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useApp();
  const owned = !!user?.isPremium;

  // UI shell: real purchase is RevenueCat-wired later; here it simulates the upgrade.
  const handleSubscribe = () => {
    updateUser({ isPremium: true });
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Animated.Text entering={enterUp(0)} style={[styles.headline, { color: colors.textPrimary }]}>
          {withAppName(owned ? PAYWALL.ownedHeadline : PAYWALL.headline)}
        </Animated.Text>
        {!owned ? (
          <Animated.Text entering={enterUp(1)} style={[styles.subline, { color: colors.textSecondary }]}>
            {PAYWALL.subline}
          </Animated.Text>
        ) : null}

        <Animated.View entering={enterUp(2)} style={styles.valueList}>
          {PAYWALL.features.premium.map((f) => (
            <View key={f} style={styles.valueRow}>
              <Ionicons name="checkmark" size={18} color={colors.textSecondary} />
              <Text style={[styles.valueText, { color: colors.textPrimary }]}>{f}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={enterUp(3)} style={styles.priceBlock}>
          {owned ? (
            <Text style={[styles.renews, { color: colors.textSecondary }]}>
              {PAYWALL.renewsTemplate.replace('{renewDate}', RENEW_DATE)}
            </Text>
          ) : (
            <>
              <Skeleton width={130} height={30} />
              <Text style={[styles.priceNote, { color: colors.textTertiary }]}>{SYSTEM.storePriceNote}</Text>
            </>
          )}
        </Animated.View>

        <View style={styles.action}>
          <Button
            label={owned ? PAYWALL.currentPlanCta : PAYWALL.subscribeCta}
            onPress={handleSubscribe}
            disabled={owned}
          />
          {owned ? (
            <PressableScale haptic="light" onPress={() => router.push('/subscription')} style={styles.linkBtn}>
              <Text style={[styles.link, { color: colors.accent }]}>{PAYWALL.manageSubscription}</Text>
            </PressableScale>
          ) : (
            <PressableScale haptic="light" onPress={() => {}} style={styles.linkBtn}>
              <Text style={[styles.link, { color: colors.textSecondary }]}>{SYSTEM.restorePurchases}</Text>
            </PressableScale>
          )}
          <Text style={[styles.legal, { color: colors.textTertiary }]}>{SYSTEM.autoRenew}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { flexGrow: 1, gap: SPACE.md },
  headline: { ...TYPE.headline },
  subline: { ...TYPE.body, marginBottom: SPACE.sm },
  valueList: { gap: SPACE.md, marginVertical: SPACE.sm },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  valueText: { fontFamily: FONTS.body.regular, fontSize: 16, flex: 1 },
  priceBlock: { gap: SPACE.xs, marginVertical: SPACE.sm },
  renews: { fontFamily: FONTS.body.regular, fontSize: 15 },
  priceNote: { ...TYPE.caption },
  action: { marginTop: 'auto', paddingTop: SPACE.lg, gap: SPACE.sm },
  linkBtn: { alignItems: 'center', paddingVertical: SPACE.sm },
  link: { fontFamily: FONTS.body.semibold, fontSize: 14 },
  legal: { ...TYPE.caption, textAlign: 'center', lineHeight: 16 },
});
