// Sticky header for pushed one-off/settings screens — back button + centered title + a
// balancing spacer (so the title is truly centered, not just left-aligned next to the button) +
// a bottom hairline divider. Sits ABOVE the scrollable content as a fixed sibling, never scrolls
// away with it. Distinct from BackChevron (bare inline chevron, no title, scrolls with content),
// which is correct for the onboarding flow's own screens — this is for everything else. Ported
// from docs/redesign/claude-design/oneoff-app.jsx's TopBar.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion';
import { FONTS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

const BTN_SIZE = 38;

export function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/welcome'));

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + SPACE.sm, backgroundColor: colors.bg, borderBottomColor: colors.divider },
      ]}
    >
      <PressableScale
        onPress={onBack ?? goBack}
        hitSlop={8}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.btn}
      >
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </PressableScale>
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE.md,
    paddingBottom: SPACE.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACE.sm,
  },
  btn: { width: BTN_SIZE, height: BTN_SIZE, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: FONTS.display.semibold, fontSize: 18 },
  spacer: { width: BTN_SIZE },
});
