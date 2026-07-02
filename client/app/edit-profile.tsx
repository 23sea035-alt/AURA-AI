// Edit profile — minimal, no demographic interrogation, no image upload (curated/initials avatar).
// First/last name; Save disabled until dirty; inline error; saving -> success toast.
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Toast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { PressableScale } from '@/components/motion';
import { ACCOUNT } from '@/constants/content';
import { FONTS, SPACE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

// Curated, no-UGC monogram tones (never a photo picker).
const MONO_TONES = ['#C77B57', '#A9683F', '#5E7B6A', '#7A6CA8', '#B58A4A', '#6E6E78'];

export default function EditProfileScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useApp();
  const a = ACCOUNT.editProfile;

  const initialFirst = user?.name?.trim().split(' ')[0] ?? '';
  const initialLast = user?.name?.trim().split(' ').slice(1).join(' ') ?? '';
  const initialColor = user?.avatarColor ?? MONO_TONES[0];
  const [first, setFirst] = useState(initialFirst);
  const [last, setLast] = useState(initialLast);
  const [avatarColor, setAvatarColor] = useState(initialColor);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);

  const firstEmpty = first.trim().length === 0;
  const dirty = first !== initialFirst || last !== initialLast || avatarColor !== initialColor;
  const displayName = `${first} ${last}`.trim() || user?.name || 'You';

  const handleSave = () => {
    if (firstEmpty) {
      setTouched(true);
      return;
    }
    setSaving(true);
    updateUser({ name: `${first.trim()} ${last.trim()}`.trim(), avatarColor });
    setTimeout(() => {
      setSaving(false);
      setToast(true);
    }, 500);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <TopBar title="Edit profile" />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarWrap}>
            <Avatar id="" name={displayName} size={88} color={avatarColor} />
            {/* Change color — curated monogram tones; selecting one dirties the form. */}
            <View style={styles.swatches}>
              {MONO_TONES.map((tone) => {
                const sel = avatarColor === tone;
                return (
                  <PressableScale
                    key={tone}
                    haptic="light"
                    onPress={() => setAvatarColor(tone)}
                    accessibilityRole="button"
                    accessibilityLabel="Avatar color"
                    accessibilityState={{ selected: sel }}
                    style={[styles.swatch, { backgroundColor: tone, borderColor: sel ? colors.textPrimary : 'transparent' }]}
                  >
                    {sel ? <Ionicons name="checkmark" size={14} color="#FFFCF6" /> : null}
                  </PressableScale>
                );
              })}
            </View>
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
  container: { flex: 1 },
  content: { flexGrow: 1, gap: SPACE.md, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
  avatarWrap: { alignItems: 'center', gap: SPACE.md, marginVertical: SPACE.md },
  swatches: { flexDirection: 'row', gap: SPACE.sm },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  fields: { gap: SPACE.sm },
  helper: { fontFamily: FONTS.body.regular, fontSize: 12, marginTop: -SPACE.xs, marginLeft: SPACE.xs },
  action: { marginTop: 'auto', paddingTop: SPACE.lg },
});
