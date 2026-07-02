// Sign in — the trust moment. SSO-first (logo → title → SSO → "or" → email/password), back
// chevron to Welcome. Restyled Warm Sanctuary form kit; UI shell over local-auth (Clerk deferred).
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { SsoButtons } from '@/components/SsoButtons';
import { PressableScale, enterUp } from '@/components/motion';
import { ONBOARDING, withAppName } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function LoginScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const a = ONBOARDING.auth;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(a.errors.badCredentials);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch {
      setError(a.errors.badCredentials);
    } finally {
      setSubmitting(false);
    }
  };

  // UI shell; real OAuth is Clerk-wired later.
  const handleSso = () => router.replace('/(tabs)');

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
            {a.titles.signin}
          </Animated.Text>
          <Animated.Text entering={enterUp(1)} style={[styles.subline, { color: colors.textSecondary }]}>
            {a.sublines.signin}
          </Animated.Text>

          {/* SSO first — lead with the easiest path. */}
          <Animated.View entering={enterUp(2)}>
            <SsoButtons onApple={handleSso} onGoogle={handleSso} />
          </Animated.View>

          <Animated.View entering={enterUp(3)} style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: colors.divider }]} />
            <Text style={[styles.orText, { color: colors.textTertiary }]}>or</Text>
            <View style={[styles.orLine, { backgroundColor: colors.divider }]} />
          </Animated.View>

          <Animated.View entering={enterUp(4)} style={styles.fields}>
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
              placeholder={a.fields.passwordPlaceholderSignin}
              secureToggle
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <PressableScale onPress={() => router.push('/(auth)/forgot-password')} haptic="light" style={styles.forgot}>
              <Text style={[styles.link, { color: colors.accent }]}>{a.forgotPasswordLink}</Text>
            </PressableScale>
          </Animated.View>

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

          <Animated.View entering={enterUp(5)} style={styles.action}>
            <Button label={a.ctas.signin} onPress={handleLogin} loading={submitting} />
            <PressableScale onPress={() => router.replace('/(auth)/register')} haptic="light" style={styles.footerLink}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                {withAppName(a.footers.toSignup.prompt)}{' '}
                <Text style={[styles.footerAction, { color: colors.accent }]}>{a.footers.toSignup.action}</Text>
              </Text>
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
  subline: { ...TYPE.body, fontSize: 15, lineHeight: 21, marginBottom: SPACE.sm },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontFamily: FONTS.body.medium, fontSize: 13 },
  fields: { gap: SPACE.lg },
  forgot: { alignSelf: 'flex-end', paddingVertical: SPACE.xs },
  link: { fontFamily: FONTS.body.semibold, fontSize: 14 },
  error: { fontFamily: FONTS.body.regular, fontSize: 14, textAlign: 'center' },
  action: { marginTop: 'auto', paddingTop: SPACE.lg, gap: SPACE.sm },
  footerLink: { alignItems: 'center', paddingVertical: SPACE.sm },
  footerText: { fontFamily: FONTS.body.medium, fontSize: 14 },
  footerAction: { fontFamily: FONTS.body.semibold, fontSize: 14 },
});
