// Square checkbox — fills with the accent + a check when on. For consent / terms rows.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet } from 'react-native';
import { PressableScale } from '@/components/motion';
import { RADIUS } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function Checkbox({ checked, onToggle, disabled }: CheckboxProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onToggle}
      disabled={disabled}
      haptic="light"
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      style={[
        styles.box,
        {
          borderColor: checked ? colors.accent : colors.border,
          backgroundColor: checked ? colors.accent : 'transparent',
        },
      ]}
    >
      {checked ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.tight + 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
