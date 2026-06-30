// Subscription management — current plan + store-managed controls. A utility screen that EXPLAINS
// (billing is App Store-managed), never mutates. Free users see their Free plan + a gentle upgrade;
// premium users see renewal + App Store management.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { PressableScale } from '@/components/motion';
import { SYSTEM } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

const RENEW_DATE = 'Jul 14, 2026'; // demo; the real app reads this from the store

export default function SubscriptionScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const isPremium = !!user?.isPremium;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Subscription</Text>

        <ListGroup label="Current plan">
          {isPremium ? (
            <ListRow first label="Premium" detail={`Renews ${RENEW_DATE}`} />
          ) : (
            <ListRow first label="Free" detail="30 messages a day, shared across your companions" />
          )}
        </ListGroup>

        {isPremium ? (
          <>
            <ListGroup label="Manage">
              <ListRow
                first
                label="Manage in App Store"
                onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {})}
              />
              <ListRow label={SYSTEM.restorePurchases} onPress={() => {}} />
            </ListGroup>
            <Text style={[styles.helper, { color: colors.textTertiary }]}>
              Billing is managed by the App Store; changes happen there.
            </Text>
            <PressableScale haptic="light" onPress={() => router.push('/premium')} style={styles.linkBtn}>
              <Text style={[styles.link, { color: colors.accent }]}>See plan details</Text>
            </PressableScale>
          </>
        ) : (
          <>
            <Text style={[styles.helper, { color: colors.textTertiary }]}>
              Upgrade for unlimited messages, your own custom companions, and more.
            </Text>
            <Button label="Upgrade to Premium" variant="tinted" onPress={() => router.push('/premium')} />
            <PressableScale haptic="light" onPress={() => {}} style={styles.linkBtn}>
              <Text style={[styles.link, { color: colors.textSecondary }]}>{SYSTEM.restorePurchases}</Text>
            </PressableScale>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { gap: SPACE.lg },
  title: { ...TYPE.headline, marginBottom: SPACE.xs },
  helper: { ...TYPE.caption, lineHeight: 16 },
  linkBtn: { alignItems: 'center', paddingVertical: SPACE.sm },
  link: { fontFamily: FONTS.body.semibold, fontSize: 14 },
});
