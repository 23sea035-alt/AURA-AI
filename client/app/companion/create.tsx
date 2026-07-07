// Companion create / customize — avatar + curated "Change look" gallery (mood filters, swap-not-
// upload), base persona (create) or locked header (edit) + 3x3x3 trait segmented controls +
// editable name + a live prose voice preview + Save. Premium-gated: on free the whole creator dims
// behind one "Unlock with Premium" door.
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
// keyboard-controller's KAV drives the lift via reanimated (not RN's LayoutAnimation), so the
// KeyboardFooter's padding interpolates in sync with the keyboard — same setup as chat/[id].tsx.
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { FilteredAvatar } from '@/components/companion/FilteredAvatar';
import { KeyboardFooter } from '@/components/KeyboardFooter';
import { LookSheet } from '@/components/companion/LookSheet';
import { Field } from '@/components/Field';
import { SectionLabel } from '@/components/SectionLabel';
import { Segmented } from '@/components/Segmented';
import { TopBar } from '@/components/TopBar';
import { PressableScale, enterUp } from '@/components/motion';
import { CREATE, PERSONAS, PERSONA_GALLERY, TRAITS } from '@/constants/content';
import { FONTS, LOGO_COLORS, RADIUS, SPACE, TYPE, personaColorsFor } from '@/constants/design';
import { DEFAULT_LOOK_ID } from '@/constants/looks';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { autoNumberName } from '@/utils/name';

// The full curated gallery (12), sourced from @aura/shared via PERSONA_GALLERY — the "Start from"
// base picker renders one card per preset. Order follows the shared roster (3 anchors, then the 9).
const ORDER = PERSONA_GALLERY.map((p) => p.name);
type PersonaName = string;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function CreateCompanionScreen() {
  const { colors, shadows, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, companions, createCompanion, updateCompanion } = useApp();
  const params = useLocalSearchParams<{ mode?: string; id?: string }>();
  const isEdit = params.mode === 'edit';
  const editing = isEdit ? companions.find((c) => c.id === params.id) : undefined;
  const locked = !user?.isPremium;

  // Editing opens on the companion's current identity; creating starts from Aurora.
  const editBase = (ORDER.find((p) => p.toLowerCase() === editing?.id) ?? 'Aurora') as PersonaName;
  const [base, setBase] = useState<PersonaName>(editBase);
  const [traits, setTraits] = useState<{ warmth: string; energy: string; verbosity: string }>(() =>
    editing && editing.traits.length === 3
      ? { warmth: editing.traits[0], energy: editing.traits[1], verbosity: editing.traits[2] }
      : { ...PERSONAS[editBase].traits },
  );
  const [name, setName] = useState(editing?.name ?? 'Aurora');
  const [look, setLook] = useState(editing?.lookId ?? DEFAULT_LOOK_ID);
  const [lookOpen, setLookOpen] = useState(false);

  const selectBase = (p: PersonaName) => {
    setBase(p);
    setTraits({ ...PERSONAS[p].traits });
    setName(p);
    setLook(DEFAULT_LOOK_ID); // a different base starts back at Default, same as the prototype
  };

  const voicePreview = `${cap(traits.warmth)} · ${traits.energy} · ${traits.verbosity}. ${PERSONAS[base].voice}`;

  const handleSave = () => {
    const finalName = autoNumberName(
      name.trim() || base,
      companions.filter((c) => c.id !== editing?.id).map((c) => c.name),
    );
    if (editing) {
      updateCompanion(editing.id, {
        name: finalName,
        traits: [traits.warmth, traits.energy, traits.verbosity],
        lookId: look,
      });
    } else {
      const pc = personaColorsFor(base.toLowerCase());
      createCompanion({
        name: finalName,
        personaKey: base.toLowerCase(),
        persona: PERSONAS[base].voice,
        traits: [traits.warmth, traits.energy, traits.verbosity],
        colorFrom: pc?.from ?? LOGO_COLORS.wine,
        colorTo: pc?.to ?? LOGO_COLORS.honey,
        lookId: look,
      });
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
              trait grid (and look) carry the premium gate below. Never a dimmed whole-form. */}
          <View style={styles.form}>
            {/* avatar + name — Change look is a corner badge on the avatar (swap-not-upload curated
                mood filters, never a new photo); the name sits right under the face so the identity
                (look + name) reads as one unit before the personality controls below. */}
            <View style={styles.avatarSection}>
              <View style={[styles.avatarWrap, shadows.e2]}>
                <FilteredAvatar personaId={base.toLowerCase()} lookId={look} size={96} />
                <PressableScale
                  haptic="light"
                  onPress={() => setLookOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={CREATE.changeLook}
                  style={[styles.changeLookBadge, { backgroundColor: colors.sheet, borderColor: colors.bg }, shadows.e1]}
                >
                  <Ionicons name="color-palette-outline" size={16} color={colors.textPrimary} />
                </PressableScale>
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
                <View style={styles.bases}>
                  {ORDER.map((p) => {
                    const sel = base === p;
                    return (
                      <PressableScale
                        key={p}
                        haptic="light"
                        onPress={() => selectBase(p)}
                        style={[
                          styles.baseCard,
                          // Selected = neutral sheet fill + neutral border + check (one-accent rule: no accent here).
                          sel
                            ? { backgroundColor: colors.sheet, borderColor: colors.textSecondary, ...shadows.e2 }
                            : { backgroundColor: colors.raised, borderColor: 'transparent', ...shadows.e1 },
                        ]}
                      >
                        <View
                          style={[
                            styles.checkBadge,
                            sel
                              ? { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary }
                              : { backgroundColor: 'transparent', borderColor: colors.border },
                          ]}
                        >
                          {sel ? <Ionicons name="checkmark" size={12} color={colors.bg} /> : null}
                        </View>
                        <Avatar id={p.toLowerCase()} name={p} size={44} />
                        <Text style={[styles.baseName, { color: colors.textPrimary }]}>{p}</Text>
                        <Text style={[styles.baseVoice, { color: colors.textSecondary }]} numberOfLines={2}>
                          {PERSONAS[p].voice}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <SectionLabel>Base persona</SectionLabel>
                <View style={[styles.editHeader, { backgroundColor: colors.raised }, shadows.e1]}>
                  <Avatar id={base.toLowerCase()} name={base} size={44} />
                  <View style={styles.editHeaderText}>
                    <Text style={[styles.baseName, { color: colors.textPrimary }]}>{base}</Text>
                    <Text style={[styles.baseVoice, { color: colors.textSecondary }]} numberOfLines={2}>
                      {PERSONAS[base].voice}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <SectionLabel>Personality</SectionLabel>
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
            (matches persona.tsx's footer). Save is the ONE accent fill for premium; the Unlock door
            + explainer for free. Kept outside the dimmed form so the door stays live when locked. */}
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
        personaId={base.toLowerCase()}
        personaName={base}
        value={look}
        onPick={setLook}
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
  // spend the one accent reserved for Save. bg-colored ring separates it from the avatar.
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
  // A wrapping 3-per-row grid: the gallery is 12 presets now, not 3, so the row wraps into 4 rows.
  bases: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  baseCard: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: SPACE.xs,
    padding: SPACE.md,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
  },
  checkBadge: {
    position: 'absolute',
    top: SPACE.sm,
    right: SPACE.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  axes: { gap: SPACE.sm },
  axis: { gap: SPACE.sm },
  axisLabel: { fontFamily: FONTS.body.semibold, fontSize: 13 },
  preview: { fontFamily: FONTS.body.regular, fontSize: 14, lineHeight: 20 },
  unlockExplainer: { ...TYPE.caption, textAlign: 'center' },
});
