// Short confirm/action prompt rendered as a content-hugging bottom sheet — the in-app
// replacement for `Alert.alert` two-button confirms. Adapted from Amibroke to Aura's theme.
// (Buttons are inline here; once the Button primitive lands they can be swapped to it.)
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import BottomSheet from '@/components/BottomSheet';
import { PressableScale } from '@/components/motion';
import { FONTS, SPACE, RADIUS, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  visible: boolean;
  /** Dismiss without confirming (backdrop tap, swipe-down, or Cancel). */
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Tints the confirm button with the error color for irreversible actions. */
  destructive?: boolean;
  /** Show a spinner on confirm + lock both buttons while the action runs. */
  loading?: boolean;
}

/**
 * The parent owns visibility and `loading`: keep it open while `onConfirm` runs, then flip
 * `visible` to false. Cancel / backdrop / swipe all call `onClose`.
 */
export default function ConfirmSheet({
  visible,
  onClose,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  destructive,
  loading,
}: Props) {
  const { colors } = useTheme();
  const confirmBg = destructive ? colors.error : colors.accent;

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable={false}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {message ? (
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
        ) : null}

        <PressableScale
          style={[styles.confirm, { backgroundColor: confirmBg }, loading && styles.disabled]}
          onPress={loading ? undefined : onConfirm}
          disabled={loading}
          haptic={destructive ? 'medium' : 'light'}
        >
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={[styles.confirmText, { color: colors.onAccent }]}>{confirmLabel}</Text>
          )}
        </PressableScale>

        <PressableScale style={styles.cancel} onPress={onClose} disabled={loading} haptic="light">
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{cancelLabel}</Text>
        </PressableScale>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: SPACE.sm, paddingTop: SPACE.xs },
  title: { ...TYPE.title, textAlign: 'center' },
  message: { ...TYPE.body, textAlign: 'center', marginBottom: SPACE.sm },
  confirm: {
    height: 52,
    borderRadius: RADIUS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACE.xs,
  },
  confirmText: { fontFamily: FONTS.body.semibold, fontSize: 17 },
  disabled: { opacity: 0.6 },
  cancel: { height: 48, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: FONTS.body.medium, fontSize: 16 },
});
