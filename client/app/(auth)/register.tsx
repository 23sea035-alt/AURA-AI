// Create account — email + password (reveal-eye) + SSO + an honest terms box that gates every
// signup method. Back chevron returns to Welcome. Restyled UI shell over local-auth (Clerk deferred).
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Field } from '@/components/Field';
import { SsoButtons } from '@/components/SsoButtons';
import { PressableScale, enterUp } from '@/components/motion';
import { ONBOARDING } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function RegisterScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { register } = useApp();
  const a = ONBOARDING.auth;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || password.length < 8) {
      setError('Enter an email and a password of at least 8 characters.');
      return;
    }
    if (!agreed) {
      setError(a.termsNudge);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const placeholderName = email.trim().split('@')[0];
      await register(placeholderName, email.trim(), password, new Date().getFullYear() - 18);
      router.replace('/onboarding');
    } catch {
      setError(a.errors.emailTaken);
    } finally {
      setSubmitting(false);
    }
  };

  // The terms box gates SSO too (per the content note). Real OAuth is Clerk-wired later.
  const handleSso = () => {
    if (!agreed) {
      setError(a.termsNudge);
      return;
    }
    router.replace('/onboarding');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackChevron />
          <Animated.Text entering={enterUp(0)} style={[styles.title, { color: colors.textPrimary }]}>
            {a.titles.signup}
          </Animated.Text>
          <Animated.Text entering={enterUp(1)} style={[styles.subline, { color: colors.textSecondary }]}>
            {a.sublines.signup}
          </Animated.Text>

          <Animated.View entering={enterUp(2)} style={styles.fields}>
            <Field
              label={a.fields.emailLabel}
              value={email}
              onChangeText={setEmail}
              placeholder={a.fields.emailPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            <Field
              label={a.fields.passwordLabel}
              value={password}
              onChangeText={setPassword}
              placeholder={a.fields.passwordPlaceholderSignup}
              secureToggle
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </Animated.View>

          <Animated.View entering={enterUp(3)}>
            <SsoButtons onApple={handleSso} onGoogle={handleSso} />
          </Animated.View>

          <Animated.View entering={enterUp(4)} style={styles.termsRow}>
            <Checkbox checked={agreed} onToggle={() => setAgreed((v) => !v)} />
            <Text style={[styles.terms, { color: colors.textSecondary }]} onPress={() => setAgreed((v) => !v)}>
              {a.terms}
            </Text>
          </Animated.View>

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

          <Animated.View entering={enterUp(5)} style={styles.action}>
            <Button label={a.ctas.signup} onPress={handleRegister} loading={submitting} disabled={!agreed} />
            <PressableScale onPress={() => router.replace('/(auth)/login')} haptic="light" style={styles.footerLink}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>{a.footers.toSignin}</Text>
            </PressableScale>
          </Animated.View>
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
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  terms: { flex: 1, fontFamily: FONTS.body.regular, fontSize: 14, lineHeight: 19 },
  error: { fontFamily: FONTS.body.regular, fontSize: 14, textAlign: 'center' },
  action: { marginTop: 'auto', paddingTop: SPACE.lg, gap: SPACE.sm },
  footerLink: { alignItems: 'center', paddingVertical: SPACE.sm },
  footerText: { fontFamily: FONTS.body.medium, fontSize: 14 },
});
