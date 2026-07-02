// Account management — data export + delete account (both Apple-required) in one screen. Resting
// screen stays neutral; the only loud destructive-red is inside the delete confirm dialog. Delete
// confirms first with the soft-delete grace explainer.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ConfirmSheet from '@/components/ConfirmSheet';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { PressableScale } from '@/components/motion';
import { Toast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { ACCOUNT } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

const DEMO_EMAIL = 'maya.chen@example.com';

export default function AccountScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useApp();
  const a = ACCOUNT.accountMgmt;
  const email = user?.email || DEMO_EMAIL;
  const [exportToast, setExportToast] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    setConfirmDelete(false);
    logout();
    router.replace('/welcome');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <TopBar title="Manage your data" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.line, { color: colors.textSecondary }]}>{a.export.line}</Text>
          <ListGroup>
            <ListRow first label={a.export.cta} onPress={() => setExportToast(true)} />
          </ListGroup>
        </View>

        {/* Danger area — a standalone destructive button (not a chevron row, which would imply
            navigation rather than an action); the loud destructive red still lives only inside the
            confirm dialog, so the resting button reads as a warm-neutral card with error-tinted text. */}
        <View style={styles.section}>
          <Text style={[styles.line, { color: colors.textSecondary }]}>{a.delete.line}</Text>
          <PressableScale
            haptic="medium"
            onPress={() => setConfirmDelete(true)}
            accessibilityRole="button"
            accessibilityLabel={a.delete.cta}
            style={[styles.deleteBtn, { backgroundColor: colors.raised, borderColor: colors.border }]}
          >
            <Text style={[styles.deleteBtnText, { color: colors.error }]}>{a.delete.cta}</Text>
          </PressableScale>
          <Text style={[styles.explainer, { color: colors.textTertiary }]}>{a.delete.explainer}</Text>
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`${a.delete.cta}?`}
        message={a.delete.explainer}
        confirmLabel={a.delete.cta}
        cancelLabel={a.delete.cancel}
        destructive
        onConfirm={handleDelete}
      />
      <Toast
        visible={exportToast}
        message={a.export.confirm.replace('{email}', email)}
        emoji="📩"
        duration={3500}
        onHide={() => setExportToast(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: SPACE.xl, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
  section: { gap: SPACE.sm },
  line: { fontFamily: FONTS.body.regular, fontSize: 15, lineHeight: 21 },
  explainer: { ...TYPE.caption, lineHeight: 17 },
  // Mirrors you.tsx's Sign out button — an isolated, self-evidently-tappable card, not a
  // navigation row. Error-tinted label; the full destructive red stays inside the confirm sheet.
  deleteBtn: {
    alignItems: 'center',
    borderRadius: RADIUS.soft,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: SPACE.lg,
  },
  deleteBtnText: { fontFamily: FONTS.body.semibold, fontSize: 16 },
});
