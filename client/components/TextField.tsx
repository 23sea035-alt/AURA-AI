// App-wide TextInput with the signature accent caret + selection color. Use everywhere
// instead of RN's TextInput so the cursor/selection is consistent; screens own the rest of
// the styling via `style`. Adapted from Amibroke's AppTextInput to read the active theme.
import React, { forwardRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export const TextField = forwardRef<TextInput, TextInputProps>(function TextField(props, ref) {
  const { colors } = useTheme();
  return (
    <TextInput ref={ref} selectionColor={colors.accent} cursorColor={colors.accent} {...props} />
  );
});

TextField.displayName = 'TextField';
