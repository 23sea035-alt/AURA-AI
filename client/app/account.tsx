// Account management — data export + delete account (both Apple-required) in one screen. Resting
// screen stays neutral; the only loud destructive-red is inside the delete confirm dialog. Delete
// confirms first with the soft-delete grace explainer.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import ConfirmSheet from '@/components/ConfirmSheet';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { Toast } from '@/components/Toast';
import { ACCOUNT } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
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
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Account</Text>

        <View style={styles.section}>
          <Text style={[styles.line, { color: colors.textSecondary }]}>{a.export.line}</Text>
          <ListGroup>
            <ListRow first label={a.export.cta} onPress={() => setExportToast(true)} />
          </ListGroup>
        </View>

        <View style={styles.section}>
          <Text style={[styles.line, { color: colors.textSecondary }]}>{a.delete.line}</Text>
          <ListGroup>
            <ListRow first destructive label={a.delete.cta} onPress={() => setConfirmDelete(true)} />
          </ListGroup>
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
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { gap: SPACE.xl },
  title: { ...TYPE.headline, marginBottom: SPACE.sm },
  section: { gap: SPACE.sm },
  line: { fontFamily: FONTS.body.regular, fontSize: 15, lineHeight: 21 },
});
