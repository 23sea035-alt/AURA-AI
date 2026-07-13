// Curated look gallery — a bottom sheet grid of the SAME portrait under each mood filter (swap,
// never upload). Selection = neutral sheet fill + check badge (one-accent rule: no accent here).
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import BottomSheet from '@/components/BottomSheet';
import { FilteredAvatar } from '@/components/companion/FilteredAvatar';
import { looksAvailableFor } from '@/components/companion/portraits';
import { PressableScale } from '@/components/motion';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { lookById } from '@/constants/looks';
import { useTheme } from '@/hooks/useTheme';

export function LookSheet({
  visible,
  onClose,
  personaId,
  personaName,
  value,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  personaId: string;
  personaName: string;
  value: string;
  onPick: (lookId: string) => void;
}) {
  const { colors } = useTheme();
  const looks = looksAvailableFor(personaId).map(lookById);

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable={false} fitContent>
      <View style={styles.wrap}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Choose a look</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          A few outfits for {personaName}. Same companion, a fresh look. Pick the one that feels right.
        </Text>

        <View style={styles.grid}>
          {looks.map((look) => {
            const on = value === look.id;
            return (
              <PressableScale
                key={look.id}
                haptic="light"
                onPress={() => onPick(look.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[
                  styles.cell,
                  { backgroundColor: on ? colors.raised : 'transparent', borderColor: on ? colors.textSecondary : colors.border },
                ]}
              >
                <View style={styles.swatchWrap}>
                  <FilteredAvatar personaId={personaId} lookId={look.id} size={60} />
                  {on ? (
                    <View style={[styles.check, { backgroundColor: colors.textPrimary }]}>
                      <Ionicons name="checkmark" size={11} color={colors.bg} />
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.label, { color: on ? colors.textPrimary : colors.textSecondary, fontFamily: on ? FONTS.body.semibold : FONTS.body.medium }]}>
                  {look.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: SPACE.xs, gap: SPACE.md },
  title: { ...TYPE.title },
  body: { ...TYPE.body, fontSize: 13.5, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  cell: {
    width: '30%',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.soft,
    borderWidth: 1.5,
  },
  swatchWrap: { width: 60, height: 60 },
  check: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12 },
});
