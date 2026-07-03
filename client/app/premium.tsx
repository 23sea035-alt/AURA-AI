// Paywall — the conversion screen, calm not celebratory. Companion-led: the primary companion
// presents (an earned warm gradient wash + hero avatar) so premium reads as "more of your
// companion," not a cold feature matrix. Presented as a real iOS modal sheet (root Stack,
// presentation:'modal') — it covers the tab bar and has native swipe-to-dismiss, so there's no
// hand-drawn grabber; a circular close stays for an explicit, discoverable exit. Store-driven
// price lives in a skeleton slot, NEVER hardcoded. Owned state shows current plan + Manage.
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CompanionPresence } from '@/components/companion/CompanionPresence';
import { Skeleton } from '@/components/Skeleton';
import { Toast } from '@/components/Toast';
import { PressableScale, enterUp } from '@/components/motion';
import { PAYWALL, SYSTEM, withAppName } from '@/constants/content';
import { DEMO } from '@/constants/demo';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { fetchStorePrice } from '@/lib/mock';

const RENEW_DATE = DEMO.renewDate; // demo; the real app reads this from the store

export default function PaywallScreen() {
  const { colors, mode, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, companions, primaryCompanionId, purchasePremium, restorePurchases } = useApp();
  const owned = !!user?.isPremium;

  const active = companions.filter((c) => !c.archivedAt);
  const companion = active.find((c) => c.id === primaryCompanionId) ?? active[0];
  const name = companion?.name ?? '';

  // Store-price seam: RevenueCat resolves the localized price; the mock returns
  // null so the placeholder slot renders (the price is NEVER hardcoded).
  const [price, setPrice] = useState<string | null | undefined>(undefined); // undefined = loading
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchStorePrice().then((p) => {
      if (live) setPrice(p);
    });
    return () => {
      live = false;
    };
  }, []);

  const handleSubscribe = async () => {
    // RevenueCat drop-in point: Purchases.purchasePackage(offering.monthly).
    setBusy(true);
    await purchasePremium();
    setBusy(false);
    router.back();
  };

  const handleRestore = async () => {
    // RevenueCat drop-in point: Purchases.restorePurchases().
    setBusy(true);
    const restored = await restorePurchases();
    setBusy(false);
    setToast(restored ? SYSTEM.restoreResult.found : SYSTEM.restoreResult.none);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const headline = owned
    ? withAppName(PAYWALL.ownedHeadline)
    : name
      ? PAYWALL.heroHeadline.replace('{name}', name)
      : withAppName(PAYWALL.headline);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {/* Earned warm wash behind the hero — the one gradient the doctrine budgets for a focal moment. */}
      <LinearGradient colors={[colors.accentTint, colors.bg]} style={styles.wash} pointerEvents="none" />

      <PressableScale
        onPress={goBack}
        hitSlop={8}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={[styles.closeBtn, { backgroundColor: colors.raised }, shadows.e1]}
      >
        <Ionicons name="close" size={16} color={colors.textTertiary} />
      </PressableScale>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Companion-led hero — the primary companion presents; premium = more time with them. */}
        {companion ? (
          <Animated.View entering={enterUp(0)} style={styles.hero}>
            <CompanionPresence
              id={companion.id}
              name={name}
              size={104}
              colorFrom={companion.colorFrom}
              colorTo={companion.colorTo}
              lookId={companion.lookId}
            />
          </Animated.View>
        ) : null}

        <Animated.Text entering={enterUp(1)} style={[styles.headline, { color: colors.textPrimary }]}>
          {headline}
        </Animated.Text>
        {!owned ? (
          <Animated.Text entering={enterUp(2)} style={[styles.subline, { color: colors.textSecondary }]}>
            {PAYWALL.subline}
          </Animated.Text>
        ) : null}

        {/* Value props in a soft raised card (intimate surface: tonal fill + soft shadow, no outline;
            rows hairline-separated). Checkmarks stay neutral — the one accent is spent on Subscribe. */}
        <Animated.View entering={enterUp(3)} style={[styles.valueCard, { backgroundColor: colors.raised }, shadows.e1]}>
          {PAYWALL.features.premium.map((f, i) => (
            <View
              key={f}
              style={[styles.valueRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}
            >
              <Ionicons name="checkmark" size={18} color={colors.textSecondary} />
              <Text style={[styles.valueText, { color: colors.textPrimary }]}>{f}</Text>
            </View>
          ))}
        </Animated.View>
        {!owned ? (
          <Text style={[styles.freeBaseline, { color: colors.textTertiary }]}>{PAYWALL.freeBaseline}</Text>
        ) : null}

        <View style={styles.priceBlock}>
          {owned ? (
            <Text style={[styles.renews, { color: colors.textSecondary }]}>
              {PAYWALL.renewsTemplate.replace('{renewDate}', RENEW_DATE)}
            </Text>
          ) : price === undefined ? (
            // Store price resolving — never a hardcoded figure.
            <Skeleton width={130} height={30} />
          ) : (
            <>
              <Text style={[styles.price, { color: colors.textPrimary }]}>
                {SYSTEM.storePriceSlot.replace('{storePrice}', price ?? '—')}
              </Text>
              {price === null ? (
                <Text style={[styles.priceNote, { color: colors.textTertiary }]}>{SYSTEM.storePriceNote}</Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.action}>
          <Button
            label={owned ? PAYWALL.currentPlanCta : PAYWALL.subscribeCta}
            onPress={() => void handleSubscribe()}
            disabled={owned}
            loading={busy}
          />
          {owned ? (
            <PressableScale haptic="light" onPress={() => router.push('/subscription')} style={styles.linkBtn}>
              <Text style={[styles.link, { color: colors.accent }]}>{PAYWALL.manageSubscription}</Text>
            </PressableScale>
          ) : (
            <PressableScale haptic="light" onPress={() => void handleRestore()} style={styles.linkBtn}>
              <Text style={[styles.link, { color: colors.textSecondary }]}>{SYSTEM.restorePurchases}</Text>
            </PressableScale>
          )}
          <Text style={[styles.legal, { color: colors.textTertiary }]}>{SYSTEM.autoRenew}</Text>
          <View style={styles.legalLinks}>
            <PressableScale haptic="light" onPress={() => router.push('/terms-of-service')}>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>{SYSTEM.termsLink}</Text>
            </PressableScale>
            <Text style={[styles.legal, { color: colors.textTertiary }]}> · </Text>
            <PressableScale haptic="light" onPress={() => router.push('/privacy')}>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>{SYSTEM.privacyLink}</Text>
            </PressableScale>
          </View>
        </View>
      </ScrollView>

      <Toast visible={toast !== null} message={toast ?? ''} onHide={() => setToast(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  // Modal is a native page-sheet (already below the status bar), so top spacing is fixed and small —
  // no insets.top (that would re-pad for a status bar the sheet doesn't reach, leaving dead space).
  closeBtn: {
    position: 'absolute',
    top: SPACE.lg,
    right: SPACE.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  content: { flexGrow: 1, gap: SPACE.md, paddingHorizontal: SPACE.xl, paddingTop: SPACE.xxl },
  hero: { alignItems: 'center', marginBottom: SPACE.xs },
  headline: { ...TYPE.headline, textAlign: 'center' },
  subline: { ...TYPE.body, textAlign: 'center', marginBottom: SPACE.sm },
  valueCard: { borderRadius: RADIUS.card, paddingHorizontal: SPACE.lg, marginTop: SPACE.sm },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.md },
  valueText: { fontFamily: FONTS.body.regular, fontSize: 16, flex: 1 },
  freeBaseline: { ...TYPE.caption, textAlign: 'center' },
  priceBlock: { gap: SPACE.xs, marginVertical: SPACE.sm, alignItems: 'center' },
  renews: { fontFamily: FONTS.body.regular, fontSize: 15 },
  price: { ...TYPE.title },
  priceNote: { ...TYPE.caption },
  action: { marginTop: 'auto', paddingTop: SPACE.lg, gap: SPACE.sm },
  linkBtn: { alignItems: 'center', paddingVertical: SPACE.sm },
  link: { fontFamily: FONTS.body.semibold, fontSize: 14 },
  legal: { ...TYPE.caption, textAlign: 'center', lineHeight: 16 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -SPACE.xs },
  legalLink: { ...TYPE.caption, textDecorationLine: 'underline' },
});
