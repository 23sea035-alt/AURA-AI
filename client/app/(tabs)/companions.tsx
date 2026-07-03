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
import { Pressable, View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import BottomSheet from '@/components/BottomSheet';
import { CompanionRow, voiceFor } from '@/components/companion/CompanionRow';
import { Segmented } from '@/components/Segmented';
import { PressableScale, enterUp } from '@/components/motion';
import { COMPANIONS } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { type Companion, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { useNow } from '@/utils/time';

const BASE_IDS = ['aurora', 'orion', 'lyra']; // the 3 base personas — always free-accessible

const editCompanion = (id: string) =>
  router.push({ pathname: '/companion/create', params: { mode: 'edit', id } });

export default function CompanionsScreen() {
  const { colors, shadows, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { companions, user, typing, primaryCompanionId, setPrimaryCompanion, archiveCompanion, restoreCompanion } =
    useApp();
  const isPremium = !!user?.isPremium;
  // Live relative-time labels (frontend-only: derived from stored ISO stamps).
  const now = useNow();

  // One swipe row open at a time — any other interaction closes it (Gmail-style).
  const swipeRefs = useRef(new Map<string, React.RefObject<SwipeableMethods | null>>());
  const swipeRefFor = (id: string) => {
    let ref = swipeRefs.current.get(id);
    if (!ref) {
      ref = React.createRef<SwipeableMethods | null>();
      swipeRefs.current.set(id, ref);
    }
    return ref;
  };
  const openSwipeId = useRef<string | null>(null);
  const closeOpenSwipe = () => {
    if (openSwipeId.current) {
      swipeRefs.current.get(openSwipeId.current)?.current?.close();
      openSwipeId.current = null;
    }
  };

  const active = companions.filter((c) => !c.archivedAt);
  const archived = companions.filter((c) => c.archivedAt);
  const canArchive = active.length > 1;

  // Active / Archived subtabs replace the old scroll-to-the-bottom collapsible; search filters
  // within the selected tab by name.
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const source = tab === 'active' ? active : archived;
  const filtered = q ? source.filter((c) => c.name.toLowerCase().includes(q)) : source;

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

      {/* Subtabs + search — fixed above the list; search filters within the selected tab. */}
      <View style={styles.controls}>
        <View style={[styles.search, { backgroundColor: colors.raised, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={COMPANIONS.search}
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query ? (
            <PressableScale
              haptic="light"
              onPress={() => setQuery('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </PressableScale>
          ) : null}
        </View>
        <Segmented options={COMPANIONS.subtabs} value={tab} onChange={(v) => setTab(v as 'active' | 'archived')} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={closeOpenSwipe}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name={q ? 'search-outline' : 'archive-outline'} size={30} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {q ? COMPANIONS.noResults.replace('{query}', query.trim()) : COMPANIONS.archivedSection.empty}
            </Text>
          </View>
        ) : tab === 'active' ? (
          filtered.map((c, i) => {
            const locked = !isPremium && !BASE_IDS.includes(c.id); // base free; custom locked-not-deleted on free
          const isHome = c.id === primaryCompanionId;
          return (
            <Animated.View key={c.id} entering={enterUp(i + 1)} style={[styles.rowShadow, shadows.e2]}>
              <CompanionRow
                companion={c}
                locked={locked}
                isHome={isHome}
                canArchive={canArchive}
                typing={!!typing[c.id]}
                now={now}
                swipeRef={swipeRefFor(c.id)}
                onSwipeOpen={() => {
                  if (openSwipeId.current && openSwipeId.current !== c.id) closeOpenSwipe();
                  openSwipeId.current = c.id;
                }}
                onSwipeClose={() => {
                  if (openSwipeId.current === c.id) openSwipeId.current = null;
                }}
                onPress={() => {
                  if (openSwipeId.current) {
                    closeOpenSwipe();
                    return;
                  }
                  router.push(locked ? '/premium' : { pathname: '/chat/[id]', params: { id: c.id } });
                }}
                onLongPress={() => {
                  closeOpenSwipe();
                  setSheetFor(c.id);
                }}
                onPin={() => {
                  setPrimaryCompanion(isHome ? '' : c.id);
                  closeOpenSwipe();
                }}
                onArchive={() => {
                  doArchive(c);
                  closeOpenSwipe();
                }}
              />
            </Animated.View>
          );
          })
        ) : (
          filtered.map((c, i) => (
            <Animated.View key={c.id} entering={enterUp(i + 1)}>
              <View style={[styles.archivedCard, { backgroundColor: colors.raised }, shadows.e1]}>
                <Avatar id={c.id} name={c.name} size={44} colorFrom={c.colorFrom} colorTo={c.colorTo} lookId={c.lookId} />
                <View style={styles.archivedText}>
                  <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={[styles.voice, { color: colors.textSecondary }]} numberOfLines={1}>
                    {voiceFor(c)}
                  </Text>
                </View>
                <PressableScale
                  haptic="light"
                  onPress={() => restoreCompanion(c.id)}
                  style={[styles.restoreBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.restoreText, { color: colors.accent }]}>{COMPANIONS.archivedSection.restore}</Text>
                </PressableScale>
              </View>
            </Animated.View>
          ))
        )}
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
                editCompanion(sheetCompanion.id);
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
  // Without flex:1 here, the ScrollView's own viewport sizes to its content rather than
  // stretching to fill the space beside the fixed header — its touchable bounds stop short of
  // the floating tab bar, leaving a dead gap where a scroll gesture never reaches the ScrollView
  // at all (looks identical to "stuck at the bottom" but is actually "never entered the view").
  scroll: { flex: 1 },
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
  // Fixed controls block (search + subtabs) between the header and the scrolling list.
  controls: { paddingHorizontal: SPACE.xl, paddingBottom: SPACE.md, gap: SPACE.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.soft,
    paddingHorizontal: SPACE.md,
    height: 44,
  },
  searchInput: { flex: 1, fontFamily: FONTS.body.regular, fontSize: 16, padding: 0 },
  // flexGrow: the content wrapper spans the full frame (not just its own content) so the whole
  // header-to-navbar area stays swipeable even when under-filled — same fix as chat/[id].tsx's
  // `thread` style.
  content: { flexGrow: 1, paddingHorizontal: SPACE.xl, gap: SPACE.md, paddingTop: SPACE.xs },
  empty: { alignItems: 'center', gap: SPACE.md, paddingTop: SPACE.xxxl },
  emptyText: { fontFamily: FONTS.body.regular, fontSize: 15, textAlign: 'center' },
  name: { fontFamily: FONTS.display.semibold, fontSize: 18, flex: 1 },
  time: { fontFamily: FONTS.body.regular, fontSize: 12 },
  voice: { fontFamily: FONTS.body.regular, fontSize: 14 },
  // Pinned/Home indicator — a small corner badge on the avatar (same convention as the create
  // button's lock badge) rather than a labeled chip, so the pinned card doesn't stand apart.
  // Rounded unit: shadow on the outer wrapper (shadows clip under overflow:
  // 'hidden'), clipping on the inner one so the bleed fields stay card-shaped.
  rowShadow: { borderRadius: RADIUS.card },
  archivedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    borderRadius: RADIUS.card,
    padding: SPACE.lg,
  },
  archivedText: { flex: 1, gap: 2 },
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
