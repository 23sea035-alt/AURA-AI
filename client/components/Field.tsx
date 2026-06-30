// Labeled text field — structural (crisp warm hairline, tight radius), accent focus ring,
// inline error, and an optional password reveal-eye. Form building block for profile / auth / age-gate.
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View, Text, StyleSheet, type TextInputProps } from 'react-native';
import { TextField } from '@/components/TextField';
import { PressableScale } from '@/components/motion';
import { FONTS, RADIUS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** Render a show/hide eye and manage secureTextEntry (for password fields). */
  secureToggle?: boolean;
}

export function Field({ label, error, secureToggle, secureTextEntry, style, onFocus, onBlur, ...rest }: FieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? colors.error : focused ? colors.accent : colors.border;
  const secure = secureToggle ? hidden : secureTextEntry;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.box, { borderColor, backgroundColor: colors.raised }]}>
        <TextField
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.textPrimary }, style]}
          secureTextEntry={secure}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {secureToggle ? (
          <PressableScale
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={styles.eye}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
          </PressableScale>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACE.sm },
  label: { fontFamily: FONTS.body.semibold, fontSize: 13 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.edit,
    paddingHorizontal: SPACE.md,
    height: 52,
  },
  input: { flex: 1, fontFamily: FONTS.body.regular, fontSize: 16, padding: 0 },
  eye: { paddingLeft: SPACE.sm },
  error: { fontFamily: FONTS.body.regular, fontSize: 13 },
});
