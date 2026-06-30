// Companion create / customize — base persona (create) or locked header (edit) + 3x3x3 trait
// segmented controls + editable name + a live prose voice preview + Save. Premium-gated: on free the
// whole creator dims behind one "Unlock with Premium" door. (Look gallery is a later add.)
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Segmented } from '@/components/Segmented';
import { PressableScale, enterUp } from '@/components/motion';
import { CREATE, PERSONAS, TRAITS } from '@/constants/content';
import { FONTS, LOGO_COLORS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

const ORDER = ['Aurora', 'Orion', 'Lyra'] as const;
type PersonaName = (typeof ORDER)[number];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function CreateCompanionScreen() {
  const { colors, shadows, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, addCompanion } = useApp();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isEdit = params.mode === 'edit';
  const locked = !user?.isPremium;

  const [base, setBase] = useState<PersonaName>('Aurora');
  const [traits, setTraits] = useState<{ warmth: string; energy: string; verbosity: string }>({
    warmth: PERSONAS.Aurora.traits.warmth,
    energy: PERSONAS.Aurora.traits.energy,
    verbosity: PERSONAS.Aurora.traits.verbosity,
  });
  const [name, setName] = useState('Aurora');

  const selectBase = (p: PersonaName) => {
    setBase(p);
    setTraits({ ...PERSONAS[p].traits });
    setName(p);
  };

  const voicePreview = `${cap(traits.warmth)} · ${traits.energy} · ${traits.verbosity}. ${PERSONAS[base].voice}`;

  const handleSave = () => {
    if (locked) {
      router.push('/premium');
      return;
    }
    addCompanion({
      name: name.trim() || base,
      persona: PERSONAS[base].voice,
      traits: [traits.warmth, traits.energy, traits.verbosity],
      colorFrom: LOGO_COLORS.wine,
      colorTo: LOGO_COLORS.honey,
    });
    router.back();
  };

  const AXES = [
    { key: 'warmth' as const, label: CREATE.traitLabels.warmth, options: TRAITS.warmth },
    { key: 'energy' as const, label: CREATE.traitLabels.energy, options: TRAITS.energy },
    { key: 'verbosity' as const, label: CREATE.traitLabels.verbosity, options: TRAITS.verbosity },
  ];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackChevron />
          <Animated.Text entering={enterUp(0)} style={[styles.title, { color: colors.textPrimary }]}>
            {isEdit ? 'Edit companion' : 'New companion'}
          </Animated.Text>

          <View pointerEvents={locked ? 'none' : 'auto'} style={[styles.form, locked && styles.dimmed]}>
            {!isEdit ? (
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
                        { backgroundColor: colors.raised },
                        sel
                          ? { ...shadows.e1, borderColor: colors.accent, borderWidth: 1.5 }
                          : { borderColor: colors.border, borderWidth: 1 },
                      ]}
                    >
                      <Avatar id={p.toLowerCase()} name={p} size={44} />
                      <Text style={[styles.baseName, { color: colors.textPrimary }]}>{p}</Text>
                    </PressableScale>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.editHeader, { backgroundColor: colors.raised }, shadows.e1]}>
                <Avatar id={base.toLowerCase()} name={base} size={44} />
                <Text style={[styles.baseName, { color: colors.textPrimary }]}>{base}</Text>
              </View>
            )}

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

            <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />

            <Text style={[styles.preview, { color: colors.textSecondary }]}>{voicePreview}</Text>
          </View>

          <View style={styles.action}>
            <Button label={locked ? CREATE.unlockCta : CREATE.saveCta} onPress={handleSave} />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { flexGrow: 1, gap: SPACE.lg },
  title: { ...TYPE.headline },
  form: { gap: SPACE.lg },
  dimmed: { opacity: 0.5 },
  bases: { flexDirection: 'row', gap: SPACE.sm },
  baseCard: {
    flex: 1,
    alignItems: 'center',
    gap: SPACE.sm,
    padding: SPACE.md,
    borderRadius: RADIUS.card,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    padding: SPACE.lg,
    borderRadius: RADIUS.card,
  },
  baseName: { fontFamily: FONTS.body.semibold, fontSize: 15 },
  axis: { gap: SPACE.sm },
  axisLabel: { fontFamily: FONTS.body.semibold, fontSize: 13 },
  preview: { fontFamily: FONTS.body.regular, fontSize: 14, lineHeight: 20 },
  action: { marginTop: 'auto', paddingTop: SPACE.lg },
});
