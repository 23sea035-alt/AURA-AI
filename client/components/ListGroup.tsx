// Apple-Settings-grammar list group, warmed up — one rounded structural card per group with
// hairline-separated rows (chevron, detail, or a first-class toggle). Used by You + settings one-offs.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Toggle } from '@/components/Toggle';
import { FONTS, RADIUS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export function ListGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.group}>
      {label ? <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{label}</Text> : null}
      <View style={[styles.card, { backgroundColor: colors.raised, borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

interface ListRowProps {
  label: string;
  detail?: string;
  onPress?: () => void;
  toggle?: { value: boolean; onValueChange: (v: boolean) => void };
  destructive?: boolean;
  first?: boolean;
}

export function ListRow({ label, detail, onPress, toggle, destructive, first }: ListRowProps) {
  const { colors } = useTheme();
  const inner = (
    <View
      style={[
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
      ]}
    >
      <Text style={[styles.rowLabel, { color: destructive ? colors.error : colors.textPrimary }]}>{label}</Text>
      <View style={styles.rowRight}>
        {detail ? <Text style={[styles.rowDetail, { color: colors.textSecondary }]}>{detail}</Text> : null}
        {toggle ? (
          <Toggle value={toggle.value} onValueChange={toggle.onValueChange} />
        ) : onPress ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        ) : null}
      </View>
    </View>
  );
  if (toggle || !onPress) return inner;
  return (
    <PressableScale onPress={onPress} haptic="light">
      {inner}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  group: { gap: SPACE.sm },
  groupLabel: { fontFamily: FONTS.body.semibold, fontSize: 13, marginLeft: SPACE.xs },
  card: { borderRadius: RADIUS.soft, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.lg,
    minHeight: 52,
    gap: SPACE.md,
  },
  rowLabel: { fontFamily: FONTS.body.regular, fontSize: 16, flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  rowDetail: { fontFamily: FONTS.body.regular, fontSize: 15 },
});
