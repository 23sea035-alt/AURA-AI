// Choose your companion — the pivotal choice (CHOOSE, not build). The full 1-of-12 curated
// gallery via the shared PersonaCarousel (roster spec §4), opening with NOTHING selected: the
// user makes this pick explicitly by tapping a card, never a pre-highlighted default. Continue
// creates the real companion and lands straight in its chat, where the persona's seeded opener
// is already waiting (createCompanion seeds it automatically — the roster is empty at onboarding).
import { TOS_VERSION, type PersonaPreset } from '@aura/shared';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { PersonaCarousel } from '@/components/companion/PersonaCarousel';
import { enterUp } from '@/components/motion';
import { ONBOARDING } from '@/constants/content';
import { LOGO_COLORS, SPACE, TYPE, personaColorsFor } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function PersonaScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { createCompanion, updateUser } = useApp();
  const [selected, setSelected] = useState<PersonaPreset | null>(null);
  const copy = ONBOARDING.persona;

  const handleContinue = () => {
    if (!selected) return;
    const preset = selected;
    const pc = personaColorsFor(preset.id);
    const result = createCompanion({
      name: preset.name,
      personaKey: preset.id,
      persona: preset.tagline,
      traits: [preset.defaultTraits.warmth, preset.defaultTraits.energy, preset.defaultTraits.verbosity],
      colorFrom: pc?.from ?? LOGO_COLORS.wine,
      colorTo: pc?.to ?? LOGO_COLORS.honey,
    });
    // tosAcceptedVersion: the register checkbox is the acceptance moment, but the PUT is
    // captured here where a verified session is guaranteed (register's own PUT would race
    // the user.created webhook mirror).
    updateUser({ onboardingDone: true, tosAcceptedVersion: TOS_VERSION });
    router.replace('/(tabs)');
    // Straight into the first chat (spec §10). Deferred a tick: a push issued in the same frame
    // as the replace gets dropped while the navigator is mid-transition (verified on sim).
    if (result.ok) {
      setTimeout(() => router.push({ pathname: '/chat/[id]', params: { id: result.id } }), 0);
    }
  };

  const ctaLabel = selected ? `${copy.ctaTemplate.replace('{Companion}', selected.name)} →` : copy.ctaEmpty;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Animated.Text entering={enterUp(0)} style={[styles.title, { color: colors.textPrimary }]}>
          {copy.title}
        </Animated.Text>
        <Animated.Text entering={enterUp(1)} style={[styles.sub, { color: colors.textSecondary }]}>
          {copy.sub}
        </Animated.Text>

        {/* The carousel sizes its cards from the full window width and manages its own side
            padding — escape the container's horizontal padding so the peek + snap math holds. */}
        <Animated.View entering={enterUp(2)} style={styles.carouselBleed}>
          <PersonaCarousel selectedId={selected?.id ?? ''} onSelect={setSelected} />
        </Animated.View>

        <Animated.Text entering={enterUp(3)} style={[styles.premium, { color: colors.textTertiary }]}>
          {copy.premiumNote}
        </Animated.Text>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + SPACE.lg, backgroundColor: colors.bg, borderTopColor: colors.divider },
        ]}
      >
        <Button label={ctaLabel} onPress={handleContinue} disabled={!selected} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  // Full-height scroll viewport even when under-filled — otherwise the area
  // below short content is dead to swipes (same fix as companions.tsx).
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: SPACE.md },
  title: { ...TYPE.headline },
  sub: { ...TYPE.body, marginBottom: SPACE.sm },
  carouselBleed: { marginHorizontal: -SPACE.xl },
  premium: { ...TYPE.caption, textAlign: 'center', marginTop: SPACE.sm },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
