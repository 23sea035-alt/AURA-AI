// Full-area loading fallback — centered spinner + optional message.
import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { FONTS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface LoadingStateProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export function LoadingState({ message, style }: LoadingStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      <ActivityIndicator color={colors.accent} />
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.md },
  message: { fontFamily: FONTS.body.regular, fontSize: 15 },
});
