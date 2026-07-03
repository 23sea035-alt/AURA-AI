// Memory — what the companion remembers about you, grouped by category. Every
// fact is the user's to control: edit in place, or remove with a graceful
// confirm. Backed by the memory API seam (GET /companions/:id/memories,
// PATCH /memories/:id, DELETE /memories/:id) through AppContext; the list
// carries real loading (skeleton) and zero states.
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheet from '@/components/BottomSheet';
import ConfirmSheet from '@/components/ConfirmSheet';
import { EmptyState } from '@/components/EmptyState';
import { ListGroup } from '@/components/ListGroup';
import { Skeleton } from '@/components/Skeleton';
import { TopBar } from '@/components/TopBar';
import { PressableScale, enterUp } from '@/components/motion';
import { MEMORY } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { DURATION } from '@/constants/motion';
import { type MemoryRow, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function MemoryScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ companion?: string }>();
  const { companions, primaryCompanionId, memories, loadMemories, editMemory, removeMemory } = useApp();

  // Pushed with a companion id from Chat/Companions; falls back to the Home companion.
  const companion =
    companions.find((c) => c.id === params.companion) ??
    companions.find((c) => c.id === primaryCompanionId) ??
    companions[0];
  const cid = companion?.id ?? '';
  const name = companion?.name ?? 'Your companion';

  const rows = memories[cid]; // undefined = loading
  const [actionFor, setActionFor] = useState<MemoryRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MemoryRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (cid) void loadMemories(cid);
  }, [cid, loadMemories]);

  const startEdit = (m: MemoryRow) => {
    setActionFor(null);
    setEditingId(m.id);
    setEditText(m.fact);
  };
  const saveEdit = () => {
    const text = editText.trim();
    if (editingId && text) void editMemory(cid, editingId, text);
    setEditingId(null);
    setEditText('');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const grouped = MEMORY.categories
    .map((cat) => ({ cat, items: (rows ?? []).filter((m) => m.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <TopBar title="Memory" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text entering={enterUp(0)} style={[styles.title, { color: colors.textPrimary }]}>
          {MEMORY.title.replace('{Companion}', name)}
        </Animated.Text>
        <Animated.Text entering={enterUp(1)} style={[styles.subline, { color: colors.textSecondary }]}>
          {MEMORY.subline}
        </Animated.Text>

        {rows === undefined ? (
          // Loading — three ghost rows in a ghost group, matching the loaded rhythm.
          <View style={styles.skeletons}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={52} radius={RADIUS.soft} />
            ))}
          </View>
        ) : rows.length === 0 ? (
          <EmptyState emoji="🪷" title={MEMORY.emptyTitle} body={MEMORY.empty.replace('{Companion}', name)} />
        ) : (
          grouped.map((g, gi) => (
            <Animated.View key={g.cat} entering={enterUp(gi + 2)}>
              <ListGroup label={g.cat}>
                {g.items.map((m, i) => {
                  const editing = editingId === m.id;
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.row,
                        i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                      ]}
                    >
                      {editing ? (
                        <>
                          <TextInput
                            value={editText}
                            onChangeText={setEditText}
                            autoFocus
                            multiline
                            style={[
                              styles.factInput,
                              { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg },
                            ]}
                          />
                          <PressableScale
                            haptic="light"
                            hitSlop={8}
                            onPress={saveEdit}
                            style={styles.more}
                            accessibilityLabel="Save memory"
                          >
                            <Ionicons name="checkmark" size={20} color={colors.accent} />
                          </PressableScale>
                          <PressableScale
                            haptic="light"
                            hitSlop={8}
                            onPress={cancelEdit}
                            style={styles.more}
                            accessibilityLabel="Cancel editing"
                          >
                            <Ionicons name="close" size={20} color={colors.textTertiary} />
                          </PressableScale>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.fact, { color: colors.textPrimary }]}>{m.fact}</Text>
                          <PressableScale
                            haptic="light"
                            hitSlop={8}
                            onPress={() => setActionFor(m)}
                            style={styles.more}
                            accessibilityLabel={`Edit or remove: ${m.fact}`}
                          >
                            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
                          </PressableScale>
                        </>
                      )}
                    </View>
                  );
                })}
              </ListGroup>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <BottomSheet visible={!!actionFor} onClose={() => setActionFor(null)} scrollable={false}>
        <View style={styles.sheet}>
          <PressableScale haptic="light" onPress={() => actionFor && startEdit(actionFor)} style={styles.sheetRow}>
            <Text style={[styles.sheetText, { color: colors.textPrimary }]}>{MEMORY.edit}</Text>
          </PressableScale>
          <PressableScale
            haptic="medium"
            onPress={() => {
              const m = actionFor;
              setActionFor(null);
              // iOS can't present a Modal while the previous one is dismissing —
              // wait out the sheet's exit animation before mounting the confirm.
              setTimeout(() => setConfirmDelete(m), DURATION.normal + 30);
            }}
            style={styles.sheetRow}
          >
            <Text style={[styles.sheetText, { color: colors.error }]}>{MEMORY.delete}</Text>
          </PressableScale>
        </View>
      </BottomSheet>

      <ConfirmSheet
        visible={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={MEMORY.deleteConfirm.title}
        message={MEMORY.deleteConfirm.body.replace('{Companion}', name)}
        confirmLabel={MEMORY.deleteConfirm.confirmLabel}
        cancelLabel={MEMORY.deleteConfirm.cancelLabel}
        destructive
        onConfirm={() => {
          if (confirmDelete) void removeMemory(cid, confirmDelete.id);
          setConfirmDelete(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: SPACE.md, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
  title: { ...TYPE.headline },
  subline: { ...TYPE.body, marginBottom: SPACE.sm },
  skeletons: { gap: SPACE.sm, marginTop: SPACE.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
  },
  fact: { flex: 1, fontFamily: FONTS.body.regular, fontSize: 15, lineHeight: 21 },
  factInput: {
    flex: 1,
    fontFamily: FONTS.body.regular,
    fontSize: 15,
    lineHeight: 21,
    borderWidth: 1,
    borderRadius: RADIUS.edit,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    minHeight: 38,
    textAlignVertical: 'top',
  },
  // ≥44pt effective target with the hitSlop (the glyph is small; the touchable isn't).
  more: { padding: 10, margin: -8 },
  sheet: { paddingTop: SPACE.xs },
  sheetRow: { paddingVertical: SPACE.md, alignItems: 'center' },
  sheetText: { fontFamily: FONTS.body.medium, fontSize: 16 },
});
