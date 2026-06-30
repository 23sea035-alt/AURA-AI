// Companions — the roster, which doubles as the chat list. Warm cards (avatar + name + voice +
// last-message + time-ago) deep-link to the pushed Chat. A premium-gated create entry sits last.
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
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACE.xl, paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text entering={enterUp(0)} style={[styles.title, { color: colors.textPrimary }]}>
          {COMPANIONS.title}
        </Animated.Text>

        {companions.map((c, i) => {
          const locked = !isPremium && i > 0; // non-default companions locked-not-deleted on free
          return (
            <Animated.View key={c.id} entering={enterUp(i + 1)}>
              <PressableScale
                haptic="light"
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.id } })}
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

        <Animated.View entering={enterUp(companions.length + 1)}>
          <PressableScale
            haptic="light"
            onPress={() => router.push(isPremium ? '/companion/create' : '/premium')}
            style={[styles.createRow, { borderColor: colors.border }]}
          >
            <Ionicons name={isPremium ? 'add' : 'lock-closed-outline'} size={18} color={colors.textSecondary} />
            <Text style={[styles.createText, { color: colors.textSecondary }]}>
              {isPremium ? 'New companion' : COMPANIONS.lockedCreate}
            </Text>
          </PressableScale>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SPACE.xl, gap: SPACE.md },
  title: { ...TYPE.headline, marginBottom: SPACE.sm },
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
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.edit,
    paddingVertical: SPACE.lg,
    paddingHorizontal: SPACE.lg,
    marginTop: SPACE.xs,
  },
  createText: { fontFamily: FONTS.body.medium, fontSize: 15 },
});
