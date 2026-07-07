// Companions — the roster, which doubles as the chat list. Warm cards (avatar + name + voice +
// last-message + time-ago) deep-link to the pushed Chat. No companion is ever locked (the
// free/premium gate is partial: tuning + look only, in the creator). Create is the floating "+"
// FAB — a first-class free action (roster spec §12), shown on the Active subtab only.
//
// Each row supports two entry points to Pin/Archive: swipe (right reveals Pin, left reveals
// Archive) for fast one-handed use, and long-press to enter Select mode with that row pre-checked
// (the batch archive/delete/unarchive workflow, spec §12). Edit now lives in the chat header's
// "Companion settings", not here. Archive is a soft-delete: hidden from this list, messages/memory
// untouched, restorable from the "Archived" subtab, whose cards open the same read-only archived
// chat (spec §8) — the same contract as archiving a conversation thread, not deleting one.
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { activeCompanionCap } from '@aura/shared';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { CompanionLimitSheet, type CompanionLimitKind } from '@/components/companion/CompanionLimitSheet';
import { CompanionRow, SelectCircle, voiceFor } from '@/components/companion/CompanionRow';
import ConfirmSheet from '@/components/ConfirmSheet';
import { Segmented } from '@/components/Segmented';
import { Toast } from '@/components/Toast';
import { PressableScale, enterUp } from '@/components/motion';
import { COMPANIONS } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { type Companion, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { activeOf, archivedOf, canArchive as canArchiveIds, canDelete as canDeleteIds } from '@/lib/roster';
import { useNow } from '@/utils/time';

export default function CompanionsScreen() {
  const { colors, shadows, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    user,
    companions,
    typing,
    primaryCompanionId,
    setPrimaryCompanion,
    archiveCompanion,
    restoreCompanion,
    archiveMany,
    restoreMany,
    deleteMany,
  } = useApp();
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

  const active = activeOf(companions);
  const archived = archivedOf(companions);
  // A row's own swipe-to-archive hides itself once it would be the last active survivor —
  // archiveMany/canArchive enforce the same min-1-active rule for the batch case below.
  const canArchiveRow = active.length > 1;

  // Active / Archived subtabs replace the old scroll-to-the-bottom collapsible; search filters
  // within the selected tab by name.
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const source = tab === 'active' ? active : archived;
  const filtered = q ? source.filter((c) => c.name.toLowerCase().includes(q)) : source;

  // ── Select mode (spec §12) — batch archive/restore/delete ─────────────────
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [limitKind, setLimitKind] = useState<CompanionLimitKind | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const enterSelect = () => {
    closeOpenSwipe();
    setSelecting(true);
    setSelectedIds(new Set());
  };
  const enterSelectWith = (id: string) => {
    closeOpenSwipe();
    setSelecting(true);
    setSelectedIds(new Set([id]));
  };
  const exitSelect = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const changeTab = (v: 'active' | 'archived') => {
    setTab(v);
    // Switching subtabs while selecting keeps Select mode but clears the selection — the
    // checked ids belong to the list that's no longer showing.
    if (selecting) setSelectedIds(new Set());
  };

  // Entry params (spec §4): the at-limit sheets elsewhere navigate here with
  // `{ select: 'active' | 'archived' }` to drop the user straight into Select on that subtab.
  const params = useLocalSearchParams<{ select?: string }>();
  useEffect(() => {
    if (params.select === 'active' || params.select === 'archived') {
      setTab(params.select);
      setSelecting(true);
      setSelectedIds(new Set());
      router.setParams({ select: undefined });
    }
  }, [params.select]);

  const selIds = Array.from(selectedIds);
  const archiveCheck = canArchiveIds(companions, selIds);
  const deleteCheck = canDeleteIds(companions, selIds);
  const archiveDisabled = selIds.length === 0 || !archiveCheck.ok;
  const unarchiveDisabled = selIds.length === 0;
  const deleteDisabled = selIds.length === 0 || !deleteCheck.ok;
  let actionHint: string | null = null;
  if (selIds.length > 0) {
    if (!deleteCheck.ok) {
      actionHint = deleteCheck.block === 'base_delete' ? COMPANIONS.select.baseDeleteHint : COMPANIONS.select.lastActiveHint;
    } else if (tab === 'active' && !archiveCheck.ok) {
      actionHint = COMPANIONS.select.lastActiveHint;
    }
  }

  const doArchiveMany = () => {
    archiveMany(selIds);
    exitSelect();
  };
  const doUnarchiveMany = () => {
    const { restored, blocked } = restoreMany(selIds);
    if (blocked > 0) {
      const cap = activeCompanionCap(!!user?.isPremium);
      setToastMsg(
        COMPANIONS.select.restoredPartialTemplate.replace('{restored}', String(restored)).replace('{cap}', String(cap)),
      );
    }
    exitSelect();
  };
  const confirmDeleteMany = () => {
    deleteMany(selIds);
    setConfirmDeleteOpen(false);
    exitSelect();
  };

  const deleteSelectionName = selIds.length === 1 ? companions.find((c) => c.id === selIds[0])?.name ?? '' : '';
  const deleteTitle =
    selIds.length === 1
      ? COMPANIONS.deleteConfirm.titleTemplate.replace('{Companion}', deleteSelectionName)
      : COMPANIONS.deleteConfirm.title;
  const deleteBody =
    selIds.length === 1 ? COMPANIONS.deleteConfirm.body : COMPANIONS.deleteConfirm.bodyBatchTemplate.replace('{n}', String(selIds.length));

  // Single restore honors the active cap (spec §6/§8) — blocked at the cap opens the same
  // at-limit sheet as create, with entry points back into Select on either subtab.
  const onRestorePress = (c: Companion) => {
    const result = restoreCompanion(c.id);
    if (!result.ok && result.block === 'active_full') setLimitKind('active_full');
  };

  const [undo, setUndo] = useState<{ id: string; name: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // The contextual action bar (tall enough to cover the floating tab bar + its bottom inset)
  // needs more list clearance than the FAB does.
  const listBottomPad = insets.bottom + (selecting ? 190 : 110);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {/* Header: title + the "Select" text control (spec §12/§16) — no icon, since none of the
          candidates read unambiguously as "enter multi-select". Swaps to a selection count + Done
          while selecting. */}
      <Animated.View entering={enterUp(0)} style={[styles.header, { paddingTop: insets.top + SPACE.xl }]}>
        {selecting ? (
          <>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {COMPANIONS.select.selectedTemplate.replace('{n}', String(selectedIds.size))}
            </Text>
            <PressableScale
              haptic="light"
              onPress={exitSelect}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={COMPANIONS.select.done}
            >
              <Text style={[styles.headerAction, { color: colors.accent }]}>{COMPANIONS.select.done}</Text>
            </PressableScale>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{COMPANIONS.title}</Text>
            <PressableScale
              haptic="light"
              onPress={enterSelect}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={COMPANIONS.select.enter}
            >
              <Text style={[styles.headerAction, { color: colors.textSecondary }]}>{COMPANIONS.select.enter}</Text>
            </PressableScale>
          </>
        )}
      </Animated.View>

      {/* Subtabs + search — fixed above the list; search filters within the selected tab. Both
          stay live in Select mode (switching subtabs is how you select across lists). */}
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
        <Segmented options={COMPANIONS.subtabs} value={tab} onChange={(v) => changeTab(v as 'active' | 'archived')} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: listBottomPad }]}
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
            const isHome = c.id === primaryCompanionId;
            return (
              <Animated.View key={c.id} entering={enterUp(i + 1)} style={[styles.rowShadow, shadows.e2]}>
                <CompanionRow
                  companion={c}
                  isHome={isHome}
                  canArchive={canArchiveRow}
                  typing={!!typing[c.id]}
                  now={now}
                  selecting={selecting}
                  selected={selectedIds.has(c.id)}
                  swipeRef={swipeRefFor(c.id)}
                  onSwipeOpen={() => {
                    if (openSwipeId.current && openSwipeId.current !== c.id) closeOpenSwipe();
                    openSwipeId.current = c.id;
                  }}
                  onSwipeClose={() => {
                    if (openSwipeId.current === c.id) openSwipeId.current = null;
                  }}
                  onPress={() => {
                    if (selecting) {
                      toggleSelect(c.id);
                      return;
                    }
                    if (openSwipeId.current) {
                      closeOpenSwipe();
                      return;
                    }
                    router.push({ pathname: '/chat/[id]', params: { id: c.id } });
                  }}
                  onLongPress={() => enterSelectWith(c.id)}
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
          filtered.map((c, i) => {
            const selected = selectedIds.has(c.id);
            return (
              <Animated.View key={c.id} entering={enterUp(i + 1)}>
                <Pressable
                  onPress={() => {
                    if (selecting) {
                      toggleSelect(c.id);
                      return;
                    }
                    // Archived-chat UX (spec §8): opening reads full history read-only; only
                    // restoring (via the button, or Unarchive in-chat) consumes an active slot.
                    router.push({ pathname: '/chat/[id]', params: { id: c.id } });
                  }}
                  onLongPress={() => enterSelectWith(c.id)}
                  style={[styles.archivedCard, { backgroundColor: colors.raised }, shadows.e1]}
                >
                  {selecting ? <SelectCircle selected={selected} /> : null}
                  <Avatar id={c.id} name={c.name} size={44} colorFrom={c.colorFrom} colorTo={c.colorTo} lookId={c.lookId} />
                  <View style={styles.archivedText}>
                    <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={[styles.voice, { color: colors.textSecondary }]} numberOfLines={1}>
                      {voiceFor(c)}
                    </Text>
                  </View>
                  {!selecting ? (
                    <PressableScale
                      haptic="light"
                      onPress={() => onRestorePress(c)}
                      style={[styles.restoreBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.restoreText, { color: colors.accent }]}>{COMPANIONS.archivedSection.restore}</Text>
                    </PressableScale>
                  ) : null}
                </Pressable>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* Create FAB — Active subtab only, hidden on Archived (a management view) and while
          selecting (nothing should fight the contextual action bar for the bottom). Floats above
          the floating tab bar (absolute bar ignores bottom-inset math at 0; ~84pt covers bar +
          margin) and the list's paddingBottom keeps the last row clear of it. */}
      {tab === 'active' && !selecting ? (
        <PressableScale
          haptic="light"
          onPress={() => router.push('/companion/create')}
          accessibilityRole="button"
          accessibilityLabel={COMPANIONS.createFab}
          style={[styles.fab, { backgroundColor: colors.accent, bottom: insets.bottom + 84 }, shadows.e2]}
        >
          <Ionicons name="add" size={28} color={colors.onAccent} />
        </PressableScale>
      ) : null}

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

      {/* Contextual action bar (spec §12) — replaces the tab bar visually while selecting. Solid
          bg surface + hairline top border, tall enough (content + safe-area padding) to cover the
          floating pill tab bar underneath rather than hiding it via navigation options. */}
      {selecting ? (
        <Animated.View
          entering={enterUp(0)}
          style={[
            styles.actionBar,
            { backgroundColor: colors.bg, borderTopColor: colors.border, paddingBottom: insets.bottom + SPACE.md },
            shadows.e3,
          ]}
        >
          {actionHint ? <Text style={[styles.actionHint, { color: colors.textTertiary }]}>{actionHint}</Text> : null}
          <View style={styles.actionRow}>
            {tab === 'active' ? (
              <Button
                label={COMPANIONS.select.archive}
                variant="secondary"
                size="md"
                disabled={archiveDisabled}
                onPress={doArchiveMany}
                style={styles.actionBtn}
              />
            ) : (
              <Button
                label={COMPANIONS.select.unarchive}
                variant="secondary"
                size="md"
                disabled={unarchiveDisabled}
                onPress={doUnarchiveMany}
                style={styles.actionBtn}
              />
            )}
            <Button
              label={COMPANIONS.select.delete}
              variant="danger"
              size="md"
              disabled={deleteDisabled}
              onPress={() => setConfirmDeleteOpen(true)}
              style={styles.actionBtn}
            />
          </View>
        </Animated.View>
      ) : null}

      <ConfirmSheet
        visible={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title={deleteTitle}
        message={deleteBody}
        confirmLabel={COMPANIONS.deleteConfirm.confirm}
        cancelLabel={COMPANIONS.deleteConfirm.cancel}
        onConfirm={confirmDeleteMany}
        destructive
      />

      <CompanionLimitSheet
        kind={limitKind}
        onClose={() => setLimitKind(null)}
        isPremium={!!user?.isPremium}
        activeCount={active.length}
        onArchive={() => {
          setTab('active');
          setSelecting(true);
          setSelectedIds(new Set());
        }}
        onManageArchived={() => {
          setTab('archived');
          setSelecting(true);
          setSelectedIds(new Set());
        }}
        onGoPremium={() => router.push('/premium')}
      />

      <Toast visible={!!toastMsg} message={toastMsg ?? ''} duration={4000} onHide={() => setToastMsg(null)} />
    </View>
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
  headerAction: { fontFamily: FONTS.body.semibold, fontSize: 16 },
  fab: {
    position: 'absolute',
    right: SPACE.xl,
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
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
  // The contextual action bar replaces the tab bar visually — full-width, solid, and tall enough
  // (paddingTop + button row + optional hint + the safe-area paddingBottom above) to fully cover
  // the floating pill tab bar rather than layering above a visible sliver of it.
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACE.md,
    paddingHorizontal: SPACE.xl,
    gap: SPACE.sm,
  },
  actionHint: { ...TYPE.caption, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: SPACE.md },
  actionBtn: { flex: 1 },
});
