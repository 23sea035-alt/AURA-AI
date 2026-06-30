// Memory — the per-companion remembered facts, grouped by category. Each fact is editable/deletable
// (••• -> action sheet; Delete confirms first). Pushed from Companions or the Chat overflow.
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import BottomSheet from '@/components/BottomSheet';
import ConfirmSheet from '@/components/ConfirmSheet';
import { EmptyState } from '@/components/EmptyState';
import { ListGroup } from '@/components/ListGroup';
import { PressableScale, enterUp } from '@/components/motion';
import { MEMORY, PERSONAS } from '@/constants/content';
import { DEMO } from '@/constants/demo';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

type Mem = { id: string; category: string; fact: string };

export default function MemoryScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ companion?: string }>();
  const companion =
    typeof params.companion === 'string' && params.companion in PERSONAS
      ? params.companion
      : DEMO.primaryCompanion;

  const [memories, setMemories] = useState<Mem[]>(
    DEMO.memories.map((m, i) => ({ id: String(i), category: m.category, fact: m.fact })),
  );
  const [actionFor, setActionFor] = useState<Mem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Mem | null>(null);

  const grouped = MEMORY.categories
    .map((cat) => ({ cat, items: memories.filter((m) => m.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Animated.Text entering={enterUp(0)} style={[styles.title, { color: colors.textPrimary }]}>
          {MEMORY.title.replace('{Companion}', companion)}
        </Animated.Text>
        <Animated.Text entering={enterUp(1)} style={[styles.subline, { color: colors.textSecondary }]}>
          {MEMORY.subline}
        </Animated.Text>

        {memories.length === 0 ? (
          <EmptyState emoji="🪷" title="Nothing yet" body={MEMORY.empty.replace('{Companion}', companion)} />
        ) : (
          grouped.map((g, gi) => (
            <Animated.View key={g.cat} entering={enterUp(gi + 2)}>
              <ListGroup label={g.cat}>
                {g.items.map((m, i) => (
                  <View
                    key={m.id}
                    style={[
                      styles.row,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                    ]}
                  >
                    <Text style={[styles.fact, { color: colors.textPrimary }]}>{m.fact}</Text>
                    <PressableScale haptic="light" hitSlop={8} onPress={() => setActionFor(m)} style={styles.more}>
                      <Ionicons name="ellipsis-horizontal" size={18} color={colors.textTertiary} />
                    </PressableScale>
                  </View>
                ))}
              </ListGroup>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <BottomSheet visible={!!actionFor} onClose={() => setActionFor(null)}>
        <View style={styles.sheet}>
          <PressableScale haptic="light" onPress={() => setActionFor(null)} style={styles.sheetRow}>
            <Text style={[styles.sheetText, { color: colors.textPrimary }]}>{MEMORY.edit}</Text>
          </PressableScale>
          <PressableScale
            haptic="medium"
            onPress={() => {
              const m = actionFor;
              setActionFor(null);
              setConfirmDelete(m);
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
        title="Delete this memory?"
        message={confirmDelete?.fact}
        confirmLabel={MEMORY.delete}
        destructive
        onConfirm={() => {
          setMemories((ms) => ms.filter((x) => x.id !== confirmDelete?.id));
          setConfirmDelete(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { gap: SPACE.md },
  title: { ...TYPE.headline },
  subline: { ...TYPE.body, marginBottom: SPACE.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md },
  fact: { flex: 1, fontFamily: FONTS.body.regular, fontSize: 15, lineHeight: 21 },
  more: { padding: 2 },
  sheet: { paddingTop: SPACE.xs },
  sheetRow: { paddingVertical: SPACE.md, alignItems: 'center' },
  sheetText: { fontFamily: FONTS.body.medium, fontSize: 16 },
});
