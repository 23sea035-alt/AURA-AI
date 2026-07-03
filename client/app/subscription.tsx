// Subscription management — current plan + store-managed controls. A utility screen that EXPLAINS
// (billing is App Store-managed), never mutates. Free users see their Free plan + a gentle upgrade;
// premium users see renewal + App Store management.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { Toast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { PressableScale } from '@/components/motion';
import { SYSTEM } from '@/constants/content';
import { DEMO } from '@/constants/demo';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

const RENEW_DATE = DEMO.renewDate; // demo; the real app reads this from the store

export default function SubscriptionScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, restorePurchases } = useApp();
  const isPremium = !!user?.isPremium;
  const [toast, setToast] = useState<string | null>(null);

  const handleRestore = async () => {
    // RevenueCat drop-in point: Purchases.restorePurchases().
    const restored = await restorePurchases();
    setToast(restored ? SYSTEM.restoreResult.found : SYSTEM.restoreResult.none);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <TopBar title="Subscription" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <ListGroup label="Current plan">
          {isPremium ? (
            <ListRow first label="Premium" detail={`Renews ${RENEW_DATE}`} />
          ) : (
            // sub, not detail: the long line renders under the label at full
            // width instead of crushing "Free" out of the row.
            <ListRow first label="Free" sub="30 messages a day, shared across your companions" />
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
              <ListRow label={SYSTEM.restorePurchases} onPress={() => void handleRestore()} />
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
            <PressableScale haptic="light" onPress={() => void handleRestore()} style={styles.linkBtn}>
              <Text style={[styles.link, { color: colors.textSecondary }]}>{SYSTEM.restorePurchases}</Text>
            </PressableScale>
          </>
        )}
      </ScrollView>

      <Toast visible={toast !== null} message={toast ?? ''} onHide={() => setToast(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Full-height scroll viewport even when under-filled — otherwise the area
  // below short content is dead to swipes (same fix as companions.tsx).
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: SPACE.lg, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
  helper: { ...TYPE.caption, lineHeight: 16 },
  linkBtn: { alignItems: 'center', paddingVertical: SPACE.sm },
  link: { fontFamily: FONTS.body.semibold, fontSize: 14 },
});
