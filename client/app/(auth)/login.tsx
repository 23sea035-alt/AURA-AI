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
import ConfirmSheet from '@/components/ConfirmSheet';
import { Field } from '@/components/Field';
import { SsoButtons } from '@/components/SsoButtons';
import { PressableScale, enterUp } from '@/components/motion';
import { ACCOUNT, ONBOARDING, withAppName } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { fetchAccountStatus } from '@/lib/backend';
import { ACCOUNT_GRACE_DAYS } from '@aura/shared';

export default function LoginScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { login, reactivate } = useApp();
  const a = ONBOARDING.auth;
  const r = ACCOUNT.accountMgmt.reactivate;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Set when the account is soft-deleted: the reactivate offer, holding the
  // credentials until the user decides. Checked BEFORE login() — signing in
  // flips user state, and Welcome's returning-user redirect would race the
  // sheet (the real server flags a deactivated account at sign-in the same way).
  const [pending, setPending] = useState<{ purgeDate: string; email: string; password: string } | null>(
    null,
  );

  const proceed = async (creds: { email: string; password: string }) => {
    const status = await fetchAccountStatus();
    if (status.status === 'deactivated' && status.deletedAt) {
      const purge = new Date(new Date(status.deletedAt).getTime() + ACCOUNT_GRACE_DAYS * 86400000);
      setPending({
        purgeDate: purge.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
        ...creds,
      });
      return;
    }
    await login(creds.email, creds.password);
    router.replace('/(tabs)');
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(a.errors.badCredentials);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await proceed({ email: email.trim(), password });
    } catch {
      setError(a.errors.badCredentials);
    } finally {
      setSubmitting(false);
    }
  };

  // UI shell; real OAuth is Clerk-wired later.
  const handleSso = () => void proceed({ email: 'sso@example.com', password: 'sso' });

  const handleReactivate = async () => {
    if (!pending) return;
    // PATCH /api/account/reactivate — clears the tombstone, back to active.
    await reactivate();
    await login(pending.email, pending.password);
    setPending(null);
    router.replace('/(tabs)');
  };

  const declineReactivate = () => setPending(null);

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

        {/* Reactivate offer for a soft-deleted account — warm, never alarmed. */}
        <ConfirmSheet
          visible={pending !== null}
          onClose={declineReactivate}
          title={r.title}
          message={r.body.replace('{date}', pending?.purgeDate ?? '')}
          confirmLabel={r.cta}
          cancelLabel={r.dismiss}
          onConfirm={() => void handleReactivate()}
        />
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
