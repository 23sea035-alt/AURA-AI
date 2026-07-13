// Companion create / customize — avatar + curated "Change look" gallery (mood filters, swap-not-
// upload), base persona carousel (create) or locked header (edit) + 3x3x3 trait segmented controls
// + editable name + a live prose voice preview + Save. Partial gate (roster spec §3/§4): base-pick
// + name + Save stay fully live for free; only the trait grid and look carry a small "Premium"
// affordance. On Save, a full roster (active/total cap) surfaces the matching at-limit sheet
// instead of a paywall redirect.
import { type PersonaPreset } from '@aura/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
// keyboard-controller's KAV drives the lift via reanimated (not RN's LayoutAnimation), so the
// KeyboardFooter's padding interpolates in sync with the keyboard — same setup as chat/[id].tsx.
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { CompanionLimitSheet, type CompanionLimitKind } from '@/components/companion/CompanionLimitSheet';
import { FilteredAvatar } from '@/components/companion/FilteredAvatar';
import { looksAvailableFor } from '@/components/companion/portraits';
import { KeyboardFooter } from '@/components/KeyboardFooter';
import { LookSheet } from '@/components/companion/LookSheet';
import { PersonaCarousel } from '@/components/companion/PersonaCarousel';
import { Field } from '@/components/Field';
import { SectionLabel } from '@/components/SectionLabel';
import { Segmented } from '@/components/Segmented';
import { TopBar } from '@/components/TopBar';
import { PressableScale } from '@/components/motion';
import { CREATE, PERSONA_GALLERY, TRAITS } from '@/constants/content';
import { FONTS, LOGO_COLORS, RADIUS, SPACE, TYPE, personaColorsFor } from '@/constants/design';
import { DEFAULT_LOOK_ID } from '@/constants/looks';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { activeOf } from '@/lib/roster';
import { autoNumberName } from '@/utils/name';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const AURORA_PRESET = PERSONA_GALLERY.find((p) => p.id === 'aurora') ?? PERSONA_GALLERY[0];

export default function CreateCompanionScreen() {
  const { colors, shadows, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, companions, createCompanion, updateCompanion } = useApp();
  const params = useLocalSearchParams<{ mode?: string; id?: string }>();
  const isEdit = params.mode === 'edit';
  const editing = isEdit ? companions.find((c) => c.id === params.id) : undefined;
  const isPremium = !!user?.isPremium;
  const locked = !isPremium;

  // Editing opens on the companion's fixed base persona (identity is the voice pack, spec §5);
  // creating starts from Aurora.
  const initialPreset =
    (isEdit && PERSONA_GALLERY.find((p) => p.id === editing?.personaKey)) || AURORA_PRESET;
  const [preset, setPreset] = useState<PersonaPreset>(initialPreset);
  const [traits, setTraits] = useState<{ warmth: string; energy: string; verbosity: string }>(() =>
    editing && editing.traits.length === 3
      ? { warmth: editing.traits[0], energy: editing.traits[1], verbosity: editing.traits[2] }
      : { ...initialPreset.defaultTraits },
  );
  const [name, setName] = useState(editing?.name ?? initialPreset.name);
  const [look, setLook] = useState(editing?.lookId ?? DEFAULT_LOOK_ID);
  const [lookOpen, setLookOpen] = useState(false);
  // Looks are art-gated per persona — the change-look badge and sheet only appear when the chosen
  // base actually has outfit variants cut (Aurora is the pilot).
  const hasLooks = looksAvailableFor(preset.id).length > 1;
  // At-limit sheets (spec §4): a full roster on Save opens the matching sheet instead of saving.
  const [limitKind, setLimitKind] = useState<CompanionLimitKind | null>(null);

  const selectBase = (p: PersonaPreset) => {
    setPreset(p);
    setTraits({ ...p.defaultTraits });
    setName(p.name);
    setLook(DEFAULT_LOOK_ID); // a different base starts back at Default, same as the prototype
  };

  const voicePreview = `${cap(traits.warmth)} · ${traits.energy} · ${traits.verbosity}. ${preset.tagline}`;

  const handleSave = () => {
    const finalName = autoNumberName(
      name.trim() || preset.name,
      companions.filter((c) => c.id !== editing?.id).map((c) => c.name),
    );
    if (editing) {
      updateCompanion(editing.id, {
        name: finalName,
        traits: [traits.warmth, traits.energy, traits.verbosity],
        lookId: look,
      });
      router.back();
      return;
    }
    const pc = personaColorsFor(preset.id);
    const result = createCompanion({
      name: finalName,
      personaKey: preset.id,
      persona: preset.tagline,
      traits: [traits.warmth, traits.energy, traits.verbosity],
      colorFrom: pc?.from ?? LOGO_COLORS.wine,
      colorTo: pc?.to ?? LOGO_COLORS.honey,
      lookId: look,
    });
    if (!result.ok) {
      setLimitKind(result.block);
      return;
    }
    router.back();
  };

  const AXES = [
    { key: 'warmth' as const, label: CREATE.traitLabels.warmth, options: TRAITS.warmth },
    { key: 'energy' as const, label: CREATE.traitLabels.energy, options: TRAITS.energy },
    { key: 'verbosity' as const, label: CREATE.traitLabels.verbosity, options: TRAITS.verbosity },
  ];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <TopBar title={isEdit ? 'Edit companion' : 'New companion'} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 128 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Partial gate (spec §4): base picker + name + Save stay live for everyone; only the
              trait grid and look carry the premium gate below. Never a dimmed whole-form. */}
          <View style={styles.form}>
            {/* avatar + name — Change look is a corner badge on the avatar (outfit recolors of the
                same portrait, never a new photo); the name sits right under the face so the identity
                (look + name) reads as one unit before the personality controls below. The badge only
                shows for personas that actually have look art cut (art-gated roll-out). */}
            <View style={styles.avatarSection}>
              <View style={[styles.avatarWrap, shadows.e2]}>
                <FilteredAvatar personaId={preset.id} lookId={look} size={96} />
                {hasLooks ? (
                  <PressableScale
                    haptic="light"
                    onPress={() => (locked ? router.push('/premium') : setLookOpen(true))}
                    accessibilityRole="button"
                    accessibilityLabel={locked ? `${CREATE.premiumBadge}: ${CREATE.changeLook}` : CREATE.changeLook}
                    style={[
                      styles.changeLookBadge,
                      locked
                        ? { backgroundColor: colors.accentTint, borderColor: colors.bg }
                        : { backgroundColor: colors.sheet, borderColor: colors.bg },
                      shadows.e1,
                    ]}
                  >
                    <Ionicons
                      name={locked ? 'sparkles' : 'color-palette-outline'}
                      size={16}
                      color={locked ? colors.accent : colors.textPrimary}
                    />
                  </PressableScale>
                ) : null}
              </View>
              <View style={styles.nameField}>
                <Field
                  value={name}
                  onChangeText={setName}
                  placeholder="Name your companion"
                  autoCapitalize="words"
                  style={styles.nameInput}
                />
              </View>
            </View>

            {!isEdit ? (
              <View style={styles.section}>
                <SectionLabel>Start from</SectionLabel>
                {/* The carousel bleeds to the screen edges by design (it manages its own peek
                    padding off the full window width) — cancel this ScrollView's horizontal
                    padding so it can escape. */}
                <View style={styles.carouselBleed}>
                  <PersonaCarousel selectedId={preset.id} onSelect={selectBase} />
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <SectionLabel>Base persona</SectionLabel>
                <View style={[styles.editHeader, { backgroundColor: colors.raised }, shadows.e1]}>
                  <Avatar id={preset.id} name={preset.name} size={44} />
                  <View style={styles.editHeaderText}>
                    <Text style={[styles.baseName, { color: colors.textPrimary }]}>{preset.name}</Text>
                    <Text style={[styles.baseVoice, { color: colors.textSecondary }]} numberOfLines={2}>
                      {preset.tagline}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <SectionLabel style={styles.sectionHeaderLabel}>Personality</SectionLabel>
                {locked ? (
                  <PressableScale
                    haptic="light"
                    onPress={() => router.push('/premium')}
                    accessibilityRole="button"
                    accessibilityLabel={`${CREATE.premiumBadge}: ${CREATE.premiumExplainer}`}
                    style={[styles.premiumChip, { backgroundColor: colors.accentTint }]}
                  >
                    <Text style={[styles.premiumChipText, { color: colors.accent }]}>{CREATE.premiumBadge}</Text>
                  </PressableScale>
                ) : null}
              </View>
              <View style={styles.axes}>
                {AXES.map((axis) => (
                  <View key={axis.key} style={styles.axis}>
                    <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>{axis.label}</Text>
                    <Segmented
                      options={axis.options}
                      value={traits[axis.key]}
                      onChange={(v) => setTraits((t) => ({ ...t, [axis.key]: v }))}
                      disabled={locked}
                    />
                  </View>
                ))}
              </View>
              <Text style={[styles.preview, { color: colors.textSecondary }]}>{voicePreview}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Floating footer dock — always in reach, not scrolled away at the bottom of the form
            (matches persona.tsx's footer). Save is the ONE accent fill and the ONLY CTA — never an
            "Unlock with Premium" door (spec §4); free gets a quiet explainer caption above it. */}
        <KeyboardFooter>
          {locked ? (
            <Text style={[styles.unlockExplainer, { color: colors.textTertiary }]}>{CREATE.premiumExplainer}</Text>
          ) : null}
          <Button label={CREATE.saveCta} onPress={handleSave} />
        </KeyboardFooter>
      </View>

      <LookSheet
        visible={lookOpen}
        onClose={() => setLookOpen(false)}
        personaId={preset.id}
        personaName={preset.name}
        value={look}
        onPick={setLook}
      />

      <CompanionLimitSheet
        kind={limitKind}
        onClose={() => setLimitKind(null)}
        isPremium={isPremium}
        activeCount={activeOf(companions).length}
        onArchive={() => router.replace({ pathname: '/(tabs)/companions', params: { select: 'active' } })}
        onManageArchived={() => router.replace({ pathname: '/(tabs)/companions', params: { select: 'archived' } })}
        onGoPremium={() => router.push('/premium')}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  // Full-height scroll viewport even when under-filled — otherwise the area
  // below short content is dead to swipes (same fix as companions.tsx).
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: SPACE.lg, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
  form: { gap: SPACE.xl },
  section: { gap: SPACE.sm },
  avatarSection: { alignItems: 'center', gap: SPACE.md },
  avatarWrap: { width: 96, height: 96, borderRadius: 48 },
  // Corner badge on the avatar (same convention as companions.tsx's pinBadge, scaled up to a
  // comfortable tap target) — sits tangent to the circle at ~4:30, neutral fill so it doesn't
  // spend the one accent reserved for Save. bg-colored ring separates it from the avatar. Free
  // swaps the fill/icon to the accent-tinted sparkle (a tiny premium marker) and routes to /premium.
  changeLookBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameField: { alignSelf: 'stretch' },
  nameInput: { textAlign: 'center' },
  // Cancels the ScrollView content's paddingHorizontal so PersonaCarousel (which sizes itself off
  // the full window width) can bleed to the screen edges and peek its neighbors correctly.
  carouselBleed: { marginHorizontal: -SPACE.xl },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    padding: SPACE.lg,
    borderRadius: RADIUS.card,
  },
  editHeaderText: { flex: 1, gap: 2 },
  baseName: { fontFamily: FONTS.body.semibold, fontSize: 15 },
  baseVoice: { fontFamily: FONTS.body.regular, fontSize: 12.5, lineHeight: 17 },
  // Section-label row for "Personality": the label's own bottom margin moves onto the row (so it
  // still reads as one clean line with the trailing Premium chip, free only) — same total spacing
  // before the trait grid as the plain SectionLabel used elsewhere on this screen.
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.sm,
  },
  sectionHeaderLabel: { marginBottom: 0 },
  premiumChip: { paddingHorizontal: SPACE.sm, paddingVertical: 3, borderRadius: RADIUS.pill },
  premiumChipText: { ...TYPE.caption },
  axes: { gap: SPACE.sm },
  axis: { gap: SPACE.sm },
  axisLabel: { fontFamily: FONTS.body.semibold, fontSize: 13 },
  preview: { fontFamily: FONTS.body.regular, fontSize: 14, lineHeight: 20 },
  unlockExplainer: { ...TYPE.caption, textAlign: 'center' },
});
