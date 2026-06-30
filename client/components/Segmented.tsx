// Apple-HIG segmented control (2-5 text-only segments). The selected segment uses a NEUTRAL raised
// fill, never the accent (so a row of these + an accent CTA keeps the one-accent rule).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressableScale } from '@/components/motion';
import { FONTS, RADIUS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface SegmentedProps {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function Segmented({ options, value, onChange, disabled }: SegmentedProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {options.map((opt) => {
        const sel = opt === value;
        return (
          <PressableScale
            key={opt}
            disabled={disabled}
            haptic="light"
            onPress={() => onChange(opt)}
            accessibilityRole="button"
            accessibilityState={{ selected: sel }}
            style={[styles.seg, sel && { backgroundColor: colors.raised }]}
          >
            <Text
              style={[
                styles.label,
                { color: sel ? colors.textPrimary : colors.textSecondary },
                sel && styles.labelSel,
              ]}
              numberOfLines={1}
            >
              {opt}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.edit, padding: 2, gap: 2 },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACE.sm, borderRadius: RADIUS.tight + 2 },
  label: { fontFamily: FONTS.body.medium, fontSize: 13, textTransform: 'capitalize' },
  labelSel: { fontFamily: FONTS.body.semibold },
});
