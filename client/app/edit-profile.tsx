// Edit profile — minimal, no demographic interrogation, no image upload (curated/initials avatar).
// First/last name; Save disabled until dirty; inline error; saving -> success toast.
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Toast } from '@/components/Toast';
import { PressableScale } from '@/components/motion';
import { ACCOUNT } from '@/constants/content';
import { FONTS, SPACE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function EditProfileScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useApp();
  const a = ACCOUNT.editProfile;

  const initialFirst = user?.name?.trim().split(' ')[0] ?? '';
  const initialLast = user?.name?.trim().split(' ').slice(1).join(' ') ?? '';
  const [first, setFirst] = useState(initialFirst);
  const [last, setLast] = useState(initialLast);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);

  const firstEmpty = first.trim().length === 0;
  const dirty = first !== initialFirst || last !== initialLast;
  const displayName = `${first} ${last}`.trim() || user?.name || 'You';

  const handleSave = () => {
    if (firstEmpty) {
      setTouched(true);
      return;
    }
    setSaving(true);
    updateUser({ name: `${first.trim()} ${last.trim()}`.trim() });
    setTimeout(() => {
      setSaving(false);
      setToast(true);
    }, 500);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackChevron />
          <View style={styles.avatarWrap}>
            <Avatar id="" name={displayName} size={88} />
            <PressableScale haptic="light" onPress={() => {}} style={styles.changeBtn}>
              <Text style={[styles.change, { color: colors.accent }]}>{a.changeAvatar}</Text>
            </PressableScale>
          </View>

          <View style={styles.fields}>
            <Field
              label={a.firstNameLabel}
              value={first}
              onChangeText={setFirst}
              autoCapitalize="words"
              autoComplete="given-name"
              returnKeyType="next"
              error={touched && firstEmpty ? a.error : undefined}
            />
            <Text style={[styles.helper, { color: colors.textTertiary }]}>{a.firstNameHelper}</Text>
            <Field
              label={a.lastNameLabel}
              value={last}
              onChangeText={setLast}
              autoCapitalize="words"
              autoComplete="family-name"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          <View style={styles.action}>
            <Button label={a.save} onPress={handleSave} loading={saving} disabled={!dirty || firstEmpty} />
          </View>
        </ScrollView>
      </View>
      <Toast visible={toast} message="Saved" emoji="✓" duration={1800} onHide={() => setToast(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { flexGrow: 1, gap: SPACE.md },
  avatarWrap: { alignItems: 'center', gap: SPACE.sm, marginVertical: SPACE.md },
  changeBtn: { paddingVertical: SPACE.xs },
  change: { fontFamily: FONTS.body.semibold, fontSize: 14 },
  fields: { gap: SPACE.sm },
  helper: { fontFamily: FONTS.body.regular, fontSize: 12, marginTop: -SPACE.xs, marginLeft: SPACE.xs },
  action: { marginTop: 'auto', paddingTop: SPACE.lg },
});
