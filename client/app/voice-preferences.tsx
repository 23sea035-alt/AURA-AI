// Voice preferences — a still utility screen (no hero motion): pick the
// companion's voice, captions on/off, speaking pace. Persisted via
// useVoicePrefs; the voice list maps onto companions.voice_id (Inworld) once
// the backend lands. Reached from the voice call's "Voice" control and You.
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { Segmented } from '@/components/Segmented';
import { TopBar } from '@/components/TopBar';
import { PressableScale } from '@/components/motion';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';
import { VOICE_OPTIONS, useVoicePrefs, type VoicePrefs } from '@/hooks/useVoicePrefs';

const PACES: VoicePrefs['pace'][] = ['relaxed', 'natural', 'brisk'];

export default function VoicePreferencesScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { prefs, update } = useVoicePrefs();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <TopBar title="Voice" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Voice picker — radio rows, one selected. */}
        <ListGroup label="Voice" footnote="How your companion sounds on calls.">
          {VOICE_OPTIONS.map((v, i) => {
            const selected = prefs.voiceId === v.id;
            return (
              <PressableScale
                key={v.id}
                haptic="light"
                onPress={() => update({ voiceId: v.id })}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[
                  styles.voiceRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                ]}
              >
                <View style={styles.voiceText}>
                  <Text style={[styles.voiceName, { color: colors.textPrimary }]}>{v.name}</Text>
                  <Text style={[styles.voiceFeel, { color: colors.textSecondary }]}>{v.feel}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selected
                      ? { borderColor: colors.accent, backgroundColor: colors.accent }
                      : { borderColor: colors.border, backgroundColor: 'transparent' },
                  ]}
                >
                  {selected ? <Ionicons name="checkmark" size={12} color={colors.onAccent} /> : null}
                </View>
              </PressableScale>
            );
          })}
        </ListGroup>

        <ListGroup label="Captions">
          <ListRow
            first
            label="Show captions"
            sub="See what your companion says, as they say it."
            toggle={{ value: prefs.captions, onValueChange: (v) => update({ captions: v }) }}
          />
        </ListGroup>

        <View style={styles.paceSection}>
          <Text style={[styles.paceLabel, { color: colors.textTertiary }]}>SPEAKING PACE</Text>
          <Segmented
            options={PACES}
            value={prefs.pace}
            onChange={(v) => update({ pace: v as VoicePrefs['pace'] })}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: SPACE.lg, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
  },
  voiceText: { flex: 1, gap: 2 },
  voiceName: { fontFamily: FONTS.body.medium, fontSize: 16 },
  voiceFeel: { fontFamily: FONTS.body.regular, fontSize: 13, lineHeight: 18 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceSection: { gap: SPACE.sm },
  paceLabel: { ...TYPE.caption, fontFamily: FONTS.body.semibold, letterSpacing: 0.6, paddingLeft: SPACE.xs },
});
