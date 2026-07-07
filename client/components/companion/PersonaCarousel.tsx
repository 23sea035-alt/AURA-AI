// The 1-of-12 persona picker (roster spec §4): a BOUNDED, user-driven carousel of larger cards
// (avatar + name + tagline) — not a grid. No looping (it's a selection task; the user must be able
// to tell they've seen all 12). Neighbors peek (~1.3 cards per viewport) and a "3 / 12" counter +
// dots keep the other gallery personas discoverable. TAP to select — never center-to-select; the
// centered card and the chosen card are independent. Shared by onboarding (the highest-stakes
// pick) and the create screen.
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { type PersonaPreset } from '@aura/shared';

import { Avatar } from '@/components/Avatar';
import { PressableScale } from '@/components/motion';
import { CREATE, PERSONA_GALLERY } from '@/constants/content';
import { FONTS, RADIUS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

// How much of each neighbor stays visible beside the snapped card — the "there's more" cue.
const PEEK = 28;
const CARD_GAP = SPACE.sm;

interface Props {
  /** The chosen preset id ('' = nothing chosen yet — onboarding opens undecided). */
  selectedId: string;
  onSelect: (preset: PersonaPreset) => void;
}

export function PersonaCarousel({ selectedId, onSelect }: Props) {
  const { colors, shadows } = useTheme();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<PersonaPreset>>(null);

  // Center-snapped cards with symmetric side padding, so mid-list both neighbors peek.
  const sidePad = SPACE.xl + PEEK;
  const cardWidth = width - sidePad * 2;
  const interval = cardWidth + CARD_GAP;

  // The VIEWED position (drives the counter/dots) — deliberately not the selection.
  const [viewed, setViewed] = useState(() => {
    const i = PERSONA_GALLERY.findIndex((p) => p.id === selectedId);
    return i >= 0 ? i : 0;
  });

  const pick = useCallback(
    (preset: PersonaPreset, index: number) => {
      onSelect(preset);
      // Settle the tapped card into the frame so the choice reads back.
      listRef.current?.scrollToIndex({ index, animated: true });
    },
    [onSelect],
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        horizontal
        data={PERSONA_GALLERY as PersonaPreset[]}
        keyExtractor={(p) => p.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: sidePad, gap: CARD_GAP }}
        initialScrollIndex={viewed}
        getItemLayout={(_, index) => ({ length: interval, offset: interval * index, index })}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / interval);
          setViewed(Math.max(0, Math.min(PERSONA_GALLERY.length - 1, i)));
        }}
        scrollEventThrottle={48}
        renderItem={({ item, index }) => {
          const sel = item.id === selectedId;
          return (
            <PressableScale
              haptic="light"
              onPress={() => pick(item, index)}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={`${item.name}. ${item.tagline}`}
              style={[
                styles.card,
                { width: cardWidth },
                // Selected = neutral sheet fill + neutral border + check (one-accent rule).
                sel
                  ? { backgroundColor: colors.sheet, borderColor: colors.textSecondary, ...shadows.e2 }
                  : { backgroundColor: colors.raised, borderColor: 'transparent', ...shadows.e1 },
              ]}
            >
              <View
                style={[
                  styles.checkBadge,
                  sel
                    ? { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary }
                    : { backgroundColor: 'transparent', borderColor: colors.border },
                ]}
              >
                {sel ? <Ionicons name="checkmark" size={13} color={colors.bg} /> : null}
              </View>
              <Avatar id={item.id} name={item.name} size={88} />
              <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
              <Text style={[styles.tagline, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.tagline}
              </Text>
            </PressableScale>
          );
        }}
      />

      {/* Discoverability cues: position counter + dots. These track the VIEWED card, not the pick. */}
      <View style={styles.cues}>
        <View style={styles.dots}>
          {PERSONA_GALLERY.map((p, i) => (
            <View
              key={p.id}
              style={[styles.dot, { backgroundColor: i === viewed ? colors.textSecondary : colors.border }]}
            />
          ))}
        </View>
        <Text style={[styles.counter, { color: colors.textTertiary }]}>
          {CREATE.counterTemplate
            .replace('{index}', String(viewed + 1))
            .replace('{count}', String(PERSONA_GALLERY.length))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACE.md },
  card: {
    alignItems: 'center',
    gap: SPACE.xs,
    paddingVertical: SPACE.xl,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
  },
  checkBadge: {
    position: 'absolute',
    top: SPACE.md,
    right: SPACE.md,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: FONTS.display.semibold, fontSize: 20, marginTop: SPACE.sm },
  tagline: { fontFamily: FONTS.body.regular, fontSize: 14, lineHeight: 19, textAlign: 'center' },
  cues: { alignItems: 'center', gap: SPACE.xs },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  counter: { fontFamily: FONTS.body.medium, fontSize: 12 },
});
