// Age gate — the first gate after auth. One warm question, a structural birth-year field, and a
// calm fail-closed stop for under-18 (neutral, non-shaming, no path forward). Replaces the
// cosmic "Security Verification" glass screen.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { enterUp } from '@/components/motion';
import { ONBOARDING, withAppName } from '@/constants/content';
import { SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function AgeVerificationScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { updateUser } = useApp();
  const [year, setYear] = useState('');
  const [blocked, setBlocked] = useState(false);
  const copy = ONBOARDING.ageGate;

  const currentYear = new Date().getFullYear();
  const y = parseInt(year, 10);
  const validYear = year.length === 4 && !Number.isNaN(y) && y >= 1900 && y <= currentYear;
  const age = validYear ? currentYear - y : null;

  const handleContinue = () => {
    if (age === null) return;
    if (age < 18) {
      updateUser({ birthYear: y, isMinor: true, ageVerified: false });
      setBlocked(true);
      return;
    }
    updateUser({ birthYear: y, isMinor: false, ageVerified: true });
    router.push('/ai-disclosure');
  };

  if (blocked) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <Animated.Text entering={FadeIn.duration(400)} style={[styles.stop, { color: colors.textPrimary }]}>
          {withAppName(copy.under18)}
        </Animated.Text>
      </View>
    );
  }

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
          <Animated.Text entering={enterUp(1)} style={[styles.body, { color: colors.textSecondary }]}>
            {withAppName(copy.body)}
          </Animated.Text>
          <Animated.View entering={enterUp(2)}>
            <Field
              label="Birth year"
              value={year}
              onChangeText={(t) => setYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              placeholder="YYYY"
              maxLength={4}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </Animated.View>
          <View style={styles.action}>
            <Button label={copy.cta} onPress={handleContinue} disabled={!validYear} />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, gap: SPACE.md },
  title: { ...TYPE.headline },
  body: { ...TYPE.body, marginBottom: SPACE.sm },
  stop: { ...TYPE.title, textAlign: 'center' },
  action: { marginTop: 'auto', paddingTop: SPACE.xl },
});
