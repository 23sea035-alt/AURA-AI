// Home — the companion's room (NOT a dashboard). Warm greeting + date, the primary companion
// present and large, a resurfaced-memory card, one loud CTA, gentle starter chips, and a quiet
// free-tier usage indicator. Presence is placed on entry, then holds still.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { PressableScale, enterUp } from '@/components/motion';
import { CHAT, HOME } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

// Demo free-tier usage until the chat usage/limit API lands.
const USAGE = { used: 18, limit: 30 };

function greetingFor(hour: number): string {
  if (hour < 12) return HOME.greetings.morning;
  if (hour < 18) return HOME.greetings.afternoon;
  return HOME.greetings.evening;
}

export default function HomeScreen() {
  const { colors, mode, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, companions, primaryCompanionId } = useApp();
  const companion = companions.find((c) => c.id === primaryCompanionId) ?? companions[0];
  const firstName = user?.name?.trim().split(' ')[0] || 'there';
  const greeting = greetingFor(new Date().getHours());
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const isPremium = !!user?.isPremium;

  if (!companion) return null;
  const isEmpty = !companion.messageCount;
  const name = companion.name;
  const withName = (s: string) => s.replace('{Companion}', name);
  const openChat = () => router.push({ pathname: '/chat/[id]', params: { id: companion.id } });
  const starters = isEmpty ? HOME.starters.empty : HOME.starters.active;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACE.xl, paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={enterUp(0)} style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {greeting}, {firstName}
          </Text>
          <Text style={[styles.date, { color: colors.textTertiary }]}>{dateLabel}</Text>
        </Animated.View>

        <Animated.View entering={enterUp(1)} style={styles.presence}>
          <Avatar id={companion.id} name={name} size={132} />
          <Text style={[styles.name, { color: colors.textPrimary }]}>{name}</Text>
          <Text style={[styles.marker, { color: colors.textTertiary }]}>{CHAT.aiMarker.toUpperCase()}</Text>
          {isEmpty ? (
            <Text style={[styles.emptyLine, { color: colors.textSecondary }]}>{withName(HOME.empty.line)}</Text>
          ) : null}
        </Animated.View>

        {!isEmpty ? (
          <Animated.View entering={FadeIn.delay(220)} style={styles.stretch}>
            <PressableScale
              haptic="light"
              onPress={openChat}
              style={[styles.remembers, { backgroundColor: colors.raised }, shadows.e1]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.accent} style={styles.remembersIcon} />
              <View style={styles.remembersText}>
                <Text style={[styles.remembersLabel, { color: colors.textTertiary }]}>
                  {withName(HOME.remembersLabel).toUpperCase()}
                </Text>
                <Text style={[styles.remembersLine, { color: colors.textPrimary }]}>{HOME.remembersLine}</Text>
              </View>
            </PressableScale>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeIn.delay(260)} style={[styles.stretch, styles.cta]}>
          <Button label={`${isEmpty ? HOME.empty.cta : HOME.cta} →`} onPress={openChat} />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(300)} style={[styles.stretch, styles.starters]}>
          {starters.map((s) => (
            <PressableScale
              key={s}
              haptic="light"
              onPress={openChat}
              style={[styles.starter, { borderColor: colors.border }]}
            >
              <Text style={[styles.starterText, { color: colors.textSecondary }]}>{withName(s)}</Text>
            </PressableScale>
          ))}
        </Animated.View>

        {!isPremium && !isEmpty ? (
          <Animated.View entering={FadeIn.delay(340)} style={styles.usage}>
            <View style={[styles.usageDot, { backgroundColor: colors.textDisabled }]} />
            <Text style={[styles.usageText, { color: colors.textTertiary }]}>
              {HOME.usageTemplate.replace('{used}', String(USAGE.used)).replace('{limit}', String(USAGE.limit))}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SPACE.xl, alignItems: 'center' },
  stretch: { alignSelf: 'stretch' },
  header: { alignSelf: 'stretch', gap: 4, marginBottom: SPACE.lg },
  greeting: { ...TYPE.headline },
  date: { fontFamily: FONTS.body.medium, fontSize: 13.5, letterSpacing: 0.1 },
  presence: { alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.lg, marginBottom: SPACE.xl },
  name: { ...TYPE.title, marginTop: SPACE.sm },
  marker: { fontFamily: FONTS.body.semibold, fontSize: 11.5, letterSpacing: 1 },
  emptyLine: { ...TYPE.body, textAlign: 'center', marginTop: SPACE.md, maxWidth: 300 },
  remembers: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.md,
    borderRadius: RADIUS.card,
    padding: SPACE.md,
  },
  remembersIcon: { marginTop: 1 },
  remembersText: { flex: 1, gap: 4 },
  remembersLabel: { fontFamily: FONTS.body.semibold, fontSize: 11, letterSpacing: 0.6 },
  remembersLine: { fontFamily: FONTS.body.medium, fontSize: 15, lineHeight: 22 },
  cta: { marginTop: SPACE.lg },
  starters: { gap: SPACE.sm, marginTop: SPACE.md },
  starter: { borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.soft, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
  starterText: { fontFamily: FONTS.body.medium, fontSize: 14 },
  usage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: SPACE.lg },
  usageDot: { width: 5, height: 5, borderRadius: 2.5 },
  usageText: { fontFamily: FONTS.body.medium, fontSize: 12 },
});
