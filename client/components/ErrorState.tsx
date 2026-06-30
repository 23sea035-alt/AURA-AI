// Error fallback with an optional retry CTA. Pair with screens that can fail to load.
import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Button } from '@/components/Button';
import { FONTS, SPACE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface ErrorStateProps {
  title?: string;
  body?: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
  center?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  body = 'Please try again in a moment.',
  retryLabel = 'Try again',
  onRetry,
  style,
  center,
}: ErrorStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, center && styles.center, style]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button label={retryLabel} variant="secondary" size="md" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: SPACE.xl },
  center: { flex: 1, justifyContent: 'center', paddingTop: 0 },
  title: { fontFamily: FONTS.display.semibold, fontSize: 20, marginBottom: SPACE.sm, textAlign: 'center' },
  body: { fontFamily: FONTS.body.regular, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  action: { marginTop: SPACE.lg, alignSelf: 'stretch' },
});
