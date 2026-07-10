// Voice preferences — a still utility screen (no hero motion): captions on/off and speaking pace.
// Voice timbre is fixed per persona (server-side Inworld casting), so there's no voice picker.
// Persisted via useVoicePrefs. Reached from the voice call's "Voice" control and You.
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { Segmented } from '@/components/Segmented';
import { TopBar } from '@/components/TopBar';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { useVoicePrefs } from '@/hooks/useVoicePrefs';
import { VOICE_FREE_SECONDS, VOICE_PREMIUM_SECONDS } from '@/lib/backend';
import { fmtVoiceTime } from '@/utils/time';
import { VOICE_PACE, type VoicePace } from '@aura/shared';

// Derived from the shared contract enum — the server maps these to rate multipliers.
const PACES: VoicePace[] = [...VOICE_PACE];

export default function VoicePreferencesScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { prefs, update } = useVoicePrefs();
  // Monthly voice meter (the paywall promise) — server-side this is GET /api/voice/usage.
  const { user, voiceUsage } = useApp();
  const isPremium = !!user?.isPremium;
  const cap = isPremium ? VOICE_PREMIUM_SECONDS : VOICE_FREE_SECONDS;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <TopBar title="Voice" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <ListGroup
          label="This month"
          footnote={
            isPremium
              ? 'Premium includes 10 hours of voice a month.'
              : 'Free includes 20 minutes of voice a month. Premium includes 10 hours.'
          }
        >
          <ListRow first label="Voice time used" detail={`${fmtVoiceTime(voiceUsage.seconds)} of ${fmtVoiceTime(cap)}`} />
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
            onChange={(v) => update({ pace: v as VoicePace })}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Full-height scroll viewport even when under-filled — otherwise the area
  // below short content is dead to swipes (same fix as companions.tsx).
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: SPACE.lg, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
  paceSection: { gap: SPACE.sm },
  paceLabel: { ...TYPE.caption, fontFamily: FONTS.body.semibold, letterSpacing: 0.6, paddingLeft: SPACE.xs },
});
