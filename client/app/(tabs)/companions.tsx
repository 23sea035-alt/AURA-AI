// Companions — the roster, which doubles as the chat list. Warm cards (avatar + name + voice +
// last-message + time-ago) deep-link to the pushed Chat. The 3 base personas are always free-
// accessible (the 30/day limit is shared across them); custom companions are locked-not-deleted on
// free. Create is an always-accessible header "+" (lock badge on free) that opens the creator.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { PressableScale, enterUp } from '@/components/motion';
import { COMPANIONS, PERSONAS } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

const BASE_IDS = ['aurora', 'orion', 'lyra']; // the 3 base personas — always free-accessible

function voiceFor(name: string): string {
  return (PERSONAS as Record<string, { voice: string }>)[name]?.voice ?? '';
}

export default function CompanionsScreen() {
  const { colors, shadows, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { companions, user } = useApp();
  const isPremium = !!user?.isPremium;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {/* Header: title + always-accessible create "+" (lock badge on free; opens the creator). */}
      <Animated.View entering={enterUp(0)} style={[styles.header, { paddingTop: insets.top + SPACE.xl }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{COMPANIONS.title}</Text>
        <PressableScale
          haptic="light"
          onPress={() => router.push('/companion/create')}
          accessibilityRole="button"
          accessibilityLabel="Create a companion"
          style={[styles.addBtn, { backgroundColor: colors.raised, borderColor: colors.border }]}
        >
          <Ionicons name="add" size={24} color={colors.textPrimary} />
          {!isPremium ? (
            <View style={[styles.lockBadge, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
              <Ionicons name="lock-closed" size={8} color={colors.onAccent} />
            </View>
          ) : null}
        </PressableScale>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {companions.map((c, i) => {
          const locked = !isPremium && !BASE_IDS.includes(c.id); // base free; custom locked-not-deleted on free
          return (
            <Animated.View key={c.id} entering={enterUp(i + 1)}>
              <PressableScale
                haptic="light"
                onPress={() => router.push(locked ? '/premium' : { pathname: '/chat/[id]', params: { id: c.id } })}
                style={[styles.card, { backgroundColor: colors.raised }, shadows.e2, locked && { opacity: 0.55 }]}
              >
                <Avatar id={c.id} name={c.name} size={56} />
                <View style={styles.cardText}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                      {c.name}
                    </Text>
                    {c.lastActive ? (
                      <Text style={[styles.time, { color: colors.textTertiary }]}>{c.lastActive}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.voice, { color: colors.textSecondary }]} numberOfLines={1}>
                    {voiceFor(c.name)}
                  </Text>
                  <Text style={[styles.preview, { color: colors.textTertiary }]} numberOfLines={1}>
                    {locked ? COMPANIONS.lockedCompanion : c.lastMessage ?? ''}
                  </Text>
                </View>
                {locked ? <Ionicons name="lock-closed" size={16} color={colors.textTertiary} /> : null}
              </PressableScale>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.xl,
    paddingBottom: SPACE.md,
    gap: SPACE.md,
  },
  title: { ...TYPE.headline, flex: 1 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: SPACE.xl, gap: SPACE.md, paddingTop: SPACE.xs },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.lg,
    borderRadius: RADIUS.card,
    padding: SPACE.lg,
  },
  cardText: { flex: 1, gap: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm },
  name: { fontFamily: FONTS.display.semibold, fontSize: 18, flex: 1 },
  time: { fontFamily: FONTS.body.regular, fontSize: 12 },
  voice: { fontFamily: FONTS.body.regular, fontSize: 14 },
  preview: { fontFamily: FONTS.body.regular, fontSize: 14 },
});
