// Profile setup — light and welcoming. "What should your companion call you?" + first/last
// name (first is what the companion uses). Continue gated on a non-empty first name.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { enterUp } from '@/components/motion';
import { ONBOARDING } from '@/constants/content';
import { SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function ProfileScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { updateUser } = useApp();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [touched, setTouched] = useState(false);
  const copy = ONBOARDING.profile;
  const firstEmpty = first.trim().length === 0;

  const handleContinue = () => {
    if (firstEmpty) {
      setTouched(true);
      return;
    }
    updateUser({ name: `${first.trim()} ${last.trim()}`.trim() });
    router.push('/persona');
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
          <Animated.Text entering={enterUp(0)} style={[styles.title, { color: colors.textPrimary }]}>
            {copy.title}
          </Animated.Text>
          <Animated.Text entering={enterUp(1)} style={[styles.subline, { color: colors.textSecondary }]}>
            {copy.subline}
          </Animated.Text>

          <Animated.View entering={enterUp(2)} style={styles.fields}>
            <Field
              label={copy.firstNameLabel}
              value={first}
              onChangeText={setFirst}
              autoCapitalize="words"
              autoComplete="given-name"
              returnKeyType="next"
              error={touched && firstEmpty ? copy.errors.firstNameEmpty : undefined}
            />
            <Field
              label={copy.lastNameLabel}
              value={last}
              onChangeText={setLast}
              autoCapitalize="words"
              autoComplete="family-name"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </Animated.View>

          <View style={styles.action}>
            <Button label={copy.cta} onPress={handleContinue} disabled={firstEmpty} />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { flexGrow: 1, gap: SPACE.md },
  title: { ...TYPE.headline },
  subline: { ...TYPE.body, marginBottom: SPACE.sm },
  fields: { gap: SPACE.lg },
  action: { marginTop: 'auto', paddingTop: SPACE.xl },
});
