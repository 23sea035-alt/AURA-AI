// Companions — the roster, which doubles as the chat list. Warm cards (avatar + name + voice +
// last-message + time-ago) deep-link to the pushed Chat. The 3 base personas are always free-
// accessible (the 30/day limit is shared across them); custom companions are locked-not-deleted on
// free. Create is an always-accessible header "+" (lock badge on free) that opens the creator.
//
// Each row supports two entry points to the same three actions (Pin/Unpin, Archive, Edit):
// swipe (right reveals Pin, left reveals Archive) for fast one-handed use, and long-press for an
// action sheet (also the discoverability fallback for swipe, plus the only path to Edit). Archive
// is a soft-delete: hidden from this list, messages/memory untouched, restorable from the
// "Archived" section — the same contract as archiving a conversation thread, not deleting one.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Pressable, View, Text, StyleSheet, ScrollView } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import BottomSheet from '@/components/BottomSheet';
import { PressableScale, enterUp } from '@/components/motion';
import { COMPANIONS, PERSONAS } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { type Companion, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

const BASE_IDS = ['aurora', 'orion', 'lyra']; // the 3 base personas — always free-accessible

function voiceFor(name: string): string {
  return (PERSONAS as Record<string, { voice: string }>)[name]?.voice ?? '';
}

const editCompanion = () => router.push({ pathname: '/companion/create', params: { mode: 'edit' } });

export default function CompanionsScreen() {
  const { colors, shadows, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { companions, user, primaryCompanionId, setPrimaryCompanion, archiveCompanion, restoreCompanion } = useApp();
  const isPremium = !!user?.isPremium;

  const active = companions.filter((c) => !c.archivedAt);
  const archived = companions.filter((c) => c.archivedAt);
  const canArchive = active.length > 1;

  const [archivedOpen, setArchivedOpen] = useState(false);
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ id: string; name: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sheetCompanion = active.find((c) => c.id === sheetFor) ?? null;

  const doArchive = (c: Companion) => {
    archiveCompanion(c.id);
    setUndo({ id: c.id, name: c.name });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 4500);
  };

  const undoArchive = () => {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    restoreCompanion(undo.id);
    setUndo(null);
  };

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
        {active.map((c, i) => {
          const locked = !isPremium && !BASE_IDS.includes(c.id); // base free; custom locked-not-deleted on free
          const isHome = c.id === primaryCompanionId;
          return (
            <Animated.View key={c.id} entering={enterUp(i + 1)}>
              <Swipeable
                friction={2}
                overshootFriction={8}
                renderLeftActions={() => (
                  <ActionPanel
                    color={colors.accent}
                    icon={isHome ? 'location' : 'location-outline'}
                    label={isHome ? COMPANIONS.swipe.unpin : COMPANIONS.swipe.pin}
                    onPress={() => setPrimaryCompanion(isHome ? '' : c.id)}
                  />
                )}
                renderRightActions={
                  canArchive
                    ? () => (
                        <ActionPanel
                          color={colors.error}
                          icon="archive-outline"
                          label={COMPANIONS.swipe.archive}
                          onPress={() => doArchive(c)}
                        />
                      )
                    : undefined
                }
              >
                <Pressable
                  onPress={() => router.push(locked ? '/premium' : { pathname: '/chat/[id]', params: { id: c.id } })}
                  onLongPress={() => setSheetFor(c.id)}
                  style={[styles.card, { backgroundColor: colors.raised }, shadows.e2, locked && { opacity: 0.55 }]}
                >
                  <View style={styles.avatarWrap}>
                    <Avatar id={c.id} name={c.name} size={56} />
                    {isHome ? (
                      <View
                        style={[styles.pinBadge, { backgroundColor: colors.accent, borderColor: colors.raised }]}
                      >
                        <Ionicons name="location" size={9} color={colors.onAccent} />
                      </View>
                    ) : null}
                  </View>
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
                  {locked ? (
                    <Ionicons name="lock-closed" size={16} color={colors.textTertiary} />
                  ) : (
                    // Subtle long-press hint — not itself interactive; the whole row already is.
                    <Ionicons name="ellipsis-horizontal" size={16} color={colors.textTertiary} style={styles.hint} />
                  )}
                </Pressable>
              </Swipeable>
            </Animated.View>
          );
        })}

        {archived.length > 0 ? (
          <View style={styles.archivedSection}>
            <PressableScale
              haptic="light"
              onPress={() => setArchivedOpen((o) => !o)}
              style={styles.archivedHeader}
              accessibilityRole="button"
              accessibilityLabel={`${COMPANIONS.archivedSection.label}, ${archived.length}`}
            >
              <Text style={[styles.archivedLabel, { color: colors.textSecondary }]}>
                {COMPANIONS.archivedSection.label} ({archived.length})
              </Text>
              <Ionicons
                name={archivedOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textTertiary}
              />
            </PressableScale>
            {archivedOpen
              ? archived.map((c) => (
                  <View
                    key={c.id}
                    style={[styles.archivedCard, { backgroundColor: colors.raised, opacity: 0.7 }]}
                  >
                    <Avatar id={c.id} name={c.name} size={40} />
                    <Text style={[styles.name, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <PressableScale
                      haptic="light"
                      onPress={() => restoreCompanion(c.id)}
                      style={[styles.restoreBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.restoreText, { color: colors.accent }]}>
                        {COMPANIONS.archivedSection.restore}
                      </Text>
                    </PressableScale>
                  </View>
                ))
              : null}
          </View>
        ) : null}
      </ScrollView>

      {undo ? (
        <View style={[styles.undoBar, { backgroundColor: colors.raised, borderColor: colors.border }, shadows.e2]}>
          <Text style={[styles.undoText, { color: colors.textPrimary }]} numberOfLines={1}>
            {COMPANIONS.undoArchived.replace('{Companion}', undo.name)}
          </Text>
          <Pressable onPress={undoArchive} hitSlop={8}>
            <Text style={[styles.undoAction, { color: colors.accent }]}>{COMPANIONS.undoAction}</Text>
          </Pressable>
        </View>
      ) : null}

      <BottomSheet visible={!!sheetCompanion} onClose={() => setSheetFor(null)} scrollable={false}>
        {sheetCompanion ? (
          <View style={styles.sheet}>
            <SheetRow
              icon="create-outline"
              label={COMPANIONS.actionSheet.edit}
              onPress={() => {
                setSheetFor(null);
                editCompanion();
              }}
            />
            <SheetRow
              icon={sheetCompanion.id === primaryCompanionId ? 'location' : 'location-outline'}
              label={sheetCompanion.id === primaryCompanionId ? COMPANIONS.swipe.unpin : COMPANIONS.swipe.pin}
              onPress={() => {
                const isHome = sheetCompanion.id === primaryCompanionId;
                setPrimaryCompanion(isHome ? '' : sheetCompanion.id);
                setSheetFor(null);
              }}
            />
            {canArchive ? (
              <SheetRow
                icon="archive-outline"
                label={COMPANIONS.swipe.archive}
                danger
                onPress={() => {
                  doArchive(sheetCompanion);
                  setSheetFor(null);
                }}
              />
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

function ActionPanel({
  color,
  icon,
  label,
  onPress,
}: {
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.actionPanel, { backgroundColor: color }]}>
      <Ionicons name={icon} size={20} color="#fff" />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function SheetRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale haptic="light" onPress={onPress} style={styles.sheetRow}>
      <Ionicons name={icon} size={18} color={danger ? colors.error : colors.textPrimary} />
      <Text style={[styles.sheetRowText, { color: danger ? colors.error : colors.textPrimary }]}>{label}</Text>
    </PressableScale>
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
  avatarWrap: { position: 'relative' },
  // Pinned/Home indicator — a small corner badge on the avatar (same convention as the create
  // button's lock badge) rather than a labeled chip, so the pinned card doesn't stand apart.
  pinBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { opacity: 0.4 },
  actionPanel: {
    width: 84,
    borderRadius: RADIUS.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionLabel: { fontFamily: FONTS.body.semibold, fontSize: 12, color: '#fff' },
  archivedSection: { marginTop: SPACE.sm, gap: SPACE.sm },
  archivedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACE.sm,
  },
  archivedLabel: { fontFamily: FONTS.body.semibold, fontSize: 13, letterSpacing: 0.2 },
  archivedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    borderRadius: RADIUS.card,
    padding: SPACE.md,
  },
  restoreBtn: {
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  restoreText: { fontFamily: FONTS.body.semibold, fontSize: 13 },
  undoBar: {
    position: 'absolute',
    left: SPACE.xl,
    right: SPACE.xl,
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.md,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  undoText: { fontFamily: FONTS.body.regular, fontSize: 14, flex: 1 },
  undoAction: { fontFamily: FONTS.body.semibold, fontSize: 14 },
  sheet: { paddingTop: SPACE.xs },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.md },
  sheetRowText: { ...TYPE.body },
});
