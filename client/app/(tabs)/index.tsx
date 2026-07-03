// Home — the companion's room (never a dashboard). A serif greeting, the
// pinned companion present and breathing on their whisper-tint, a resurfaced
// memory as a quiet serif moment, one loud CTA, starter chips that pre-fill the
// composer, and a whisper of free-tier usage. Two-beat choreography on entry
// (greeting → presence → the rest); after that the room holds still.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CompanionPresence } from '@/components/companion/CompanionPresence';
import { PressableScale, enterUp } from '@/components/motion';
import { CHAT, HOME } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { friendlyFirstName } from '@/utils/name';

function greetingFor(hour: number): string {
  if (hour < 12) return HOME.greetings.morning;
  if (hour < 18) return HOME.greetings.afternoon;
  return HOME.greetings.evening;
}

export default function HomeScreen() {
  const { colors, mode, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, companions, primaryCompanionId, usage } = useApp();
  const active = companions.filter((c) => !c.archivedAt);
  const companion = active.find((c) => c.id === primaryCompanionId) ?? active[0];
  const firstName = friendlyFirstName(user?.name);
  const greeting = greetingFor(new Date().getHours());
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const isPremium = !!user?.isPremium;

  if (!companion) return null;
  const isEmpty = !companion.messageCount;
  const name = companion.name;
  const withName = (s: string) => s.replace('{Companion}', name);
  const openChat = (starter?: string) =>
    router.push({ pathname: '/chat/[id]', params: { id: companion.id, ...(starter ? { starter } : {}) } });
  const starters = isEmpty ? HOME.starters.empty : HOME.starters.active;
  const atCap = !isPremium && usage.used >= usage.limit;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACE.xl, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={enterUp(0)} style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {greeting}, {firstName}
          </Text>
          <Text style={[styles.date, { color: colors.textTertiary }]}>{dateLabel}</Text>
        </Animated.View>

        {/* Empty state is sparse — center the presence in the room instead of
            top-weighting it with dead space below. */}
        {isEmpty ? <View style={styles.grow} /> : null}

        <Animated.View entering={enterUp(1)} style={styles.presence}>
          <CompanionPresence
            id={companion.id}
            name={name}
            size={132}
            colorFrom={companion.colorFrom}
            colorTo={companion.colorTo}
          />
          <Text style={[styles.name, { color: colors.textPrimary }]}>{name}</Text>
          {/* Honesty cue is meaning-bearing — secondary, not fine-print tertiary (SC 1.4.3). */}
          <Text style={[styles.marker, { color: colors.textSecondary }]}>{CHAT.aiMarker.toUpperCase()}</Text>
          {isEmpty ? (
            <Text style={[styles.emptyLine, { color: colors.textSecondary }]}>{withName(HOME.empty.line)}</Text>
          ) : null}
        </Animated.View>

        {!isEmpty ? (
          <Animated.View entering={FadeIn.delay(220)} style={styles.stretch}>
            {/* Read-only resurfaced memory — a serif moment, not a data card.
                Backed by companions.remember_question once the API lands. */}
            <PressableScale
              haptic="light"
              onPress={() => openChat()}
              accessibilityLabel={`${withName(HOME.remembersLabel)}: ${HOME.remembersLine}`}
              style={[styles.remembers, { backgroundColor: colors.raised }, shadows.e1]}
            >
              <Text style={[styles.remembersLabel, { color: colors.textTertiary }]}>
                {withName(HOME.remembersLabel).toUpperCase()}
              </Text>
              <Text style={[styles.remembersLine, { color: colors.textPrimary }]}>{HOME.remembersLine}</Text>
            </PressableScale>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeIn.delay(260)} style={[styles.stretch, styles.cta]}>
          <Button label={`${isEmpty ? HOME.empty.cta : HOME.cta} →`} onPress={() => openChat()} />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(300)} style={[styles.stretch, styles.starters]}>
          {starters.map((s) => (
            <PressableScale
              key={s}
              haptic="light"
              onPress={() => openChat(withName(s))}
              // Tonal fill + soft shadow (like every tappable card) — the old
              // hairline-only pill measured 1.17:1 and read as stray text (SC 1.4.11).
              style={[styles.starter, { backgroundColor: colors.raised }, shadows.e1]}
            >
              <Text style={[styles.starterText, { color: colors.textSecondary }]}>{withName(s)}</Text>
            </PressableScale>
          ))}
        </Animated.View>

        {isEmpty ? <View style={styles.grow} /> : null}

        {!isPremium && !isEmpty ? (
          <Animated.View entering={FadeIn.delay(340)} style={styles.usage}>
            <View style={[styles.usageDot, { backgroundColor: atCap ? colors.accent : colors.textTertiary }]} />
            <Text style={[styles.usageText, { color: atCap ? colors.accent : colors.textSecondary }]}>
              {HOME.usageTemplate.replace('{used}', String(usage.used)).replace('{limit}', String(usage.limit))}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // flex:1 so the scroll viewport stretches to the screen — its touchable bounds
  // must reach the floating tab bar.
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: SPACE.xl, alignItems: 'center' },
  grow: { flexGrow: 1 },
  stretch: { alignSelf: 'stretch' },
  header: { alignSelf: 'stretch', gap: 4, marginBottom: SPACE.md },
  greeting: { ...TYPE.headline },
  date: { ...TYPE.label, fontFamily: FONTS.body.medium },
  presence: { alignItems: 'center', gap: SPACE.xs, marginTop: SPACE.md, marginBottom: SPACE.xl },
  name: { ...TYPE.title, marginTop: SPACE.xs },
  marker: { ...TYPE.caption, fontFamily: FONTS.body.semibold, letterSpacing: 1 },
  emptyLine: { ...TYPE.body, textAlign: 'center', marginTop: SPACE.md, maxWidth: 300 },
  remembers: {
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.lg,
    gap: SPACE.sm,
  },
  remembersLabel: { ...TYPE.caption, fontFamily: FONTS.body.semibold, letterSpacing: 0.6 },
  remembersLine: { fontFamily: FONTS.display.medium, fontSize: 19, lineHeight: 26 },
  cta: { marginTop: SPACE.lg },
  starters: { gap: SPACE.sm, marginTop: SPACE.md },
  starter: {
    borderRadius: RADIUS.soft,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
  },
  starterText: { ...TYPE.label, fontFamily: FONTS.body.medium },
  usage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: SPACE.lg },
  usageText: { ...TYPE.caption },
  usageDot: { width: 5, height: 5, borderRadius: RADIUS.pill },
});
