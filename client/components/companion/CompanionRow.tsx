// One roster row: the warm companion card riding a Gmail-style Swipeable —
// the pin/archive color fields bleed edge-to-edge under the card (clipped by
// the rounded wrapper) so mid-swipe the card visibly slides over a continuous
// CTA surface. The parent owns single-open-row bookkeeping via ref + callbacks.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Avatar } from '@/components/Avatar';
import { COMPANIONS, PERSONAS } from '@/constants/content';
import { FONTS, RADIUS, SPACE } from '@/constants/design';
import type { Companion } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { timeAgo } from '@/utils/time';

// Canonical personas carry their picker voice line; custom companions restate
// their trait tuning ("warm · playful · expansive") so every card has a voice.
export function voiceFor(c: Companion): string {
  const canon = (PERSONAS as Record<string, { voice: string }>)[c.name]?.voice;
  return canon ?? c.traits.join(' · ');
}

interface CompanionRowProps {
  companion: Companion;
  isHome: boolean;
  canArchive: boolean;
  typing: boolean;
  /** Ticking clock for the live relative-time label. */
  now: number;
  swipeRef: React.RefObject<SwipeableMethods | null>;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
  onPress: () => void;
  onLongPress: () => void;
  onPin: () => void;
  onArchive: () => void;
}

export function CompanionRow({
  companion: c,
  isHome,
  canArchive,
  typing,
  now,
  swipeRef,
  onSwipeOpen,
  onSwipeClose,
  onPress,
  onLongPress,
  onPin,
  onArchive,
}: CompanionRowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.rowClip}>
      <Swipeable
        ref={swipeRef}
        friction={2}
        overshootFriction={8}
        onSwipeableWillOpen={onSwipeOpen}
        onSwipeableClose={onSwipeClose}
        renderLeftActions={() => (
          <ActionPanel
            side="left"
            color={colors.accent}
            icon={isHome ? 'location' : 'location-outline'}
            label={isHome ? COMPANIONS.swipe.unpin : COMPANIONS.swipe.pin}
            onPress={onPin}
          />
        )}
        renderRightActions={
          canArchive
            ? () => (
                <ActionPanel
                  side="right"
                  color={colors.error}
                  icon="archive-outline"
                  label={COMPANIONS.swipe.archive}
                  onPress={onArchive}
                />
              )
            : undefined
        }
      >
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          style={[styles.card, { backgroundColor: colors.raised }]}
        >
          <View style={styles.avatarWrap}>
            <Avatar id={c.id} name={c.name} size={56} colorFrom={c.colorFrom} colorTo={c.colorTo} lookId={c.lookId} />
            {isHome ? (
              <View style={[styles.pinBadge, { backgroundColor: colors.accent, borderColor: colors.raised }]}>
                <Ionicons name="location" size={9} color={colors.onAccent} />
              </View>
            ) : null}
          </View>
          <View style={styles.cardText}>
            <View style={styles.cardTop}>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {c.name}
              </Text>
              {c.lastActiveAt ? (
                <Text style={[styles.time, { color: colors.textTertiary }]}>{timeAgo(c.lastActiveAt, now)}</Text>
              ) : null}
            </View>
            <Text style={[styles.voice, { color: colors.textSecondary }]} numberOfLines={1}>
              {voiceFor(c)}
            </Text>
            {typing ? (
              <Text style={[styles.typing, { color: colors.accent }]} numberOfLines={1}>
                {`${c.name} is typing…`}
              </Text>
            ) : (
              <Text style={[styles.preview, { color: colors.textTertiary }]} numberOfLines={1}>
                {c.lastMessage ?? ''}
              </Text>
            )}
          </View>
          {/* Subtle long-press hint — not itself interactive; the whole row already is. */}
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.textTertiary} style={styles.hint} />
        </Pressable>
      </Swipeable>
    </View>
  );
}

function ActionPanel({
  side,
  color,
  icon,
  label,
  onPress,
}: {
  side: 'left' | 'right';
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.actionPanel}>
      {/* The color field bleeds under the card (clipped by the rounded wrapper)
          so mid-swipe reads as the card overlapping a continuous CTA surface. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: color },
          side === 'left' ? styles.bleedRight : styles.bleedLeft,
        ]}
      />
      <Ionicons name={icon} size={20} color={colors.onAccent} />
      <Text style={[styles.actionLabel, { color: colors.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Clips the bleed fields to the card shape; the shadow lives on the parent
  // wrapper (shadows clip under overflow: 'hidden').
  rowClip: { borderRadius: RADIUS.card, overflow: 'hidden' },
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
  typing: { fontFamily: FONTS.body.medium, fontSize: 14, fontStyle: 'italic' },
  avatarWrap: { position: 'relative' },
  // Pinned/Home indicator — a small corner badge on the avatar.
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
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bleedRight: { right: -600 },
  bleedLeft: { left: -600 },
  actionLabel: { fontFamily: FONTS.body.semibold, fontSize: 12 },
});
