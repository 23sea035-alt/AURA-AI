// Email verification — the Clerk-shaped step between sign-up and onboarding.
// Six-digit code UI with a resend countdown. backend.authVerifyEmail is the
// seam: mock mode accepts any complete code; live mode attempts Clerk's
// signUp.attemptEmailAddressVerification (Clerk sends the real email).
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { enterUp } from '@/components/motion';
import { ONBOARDING } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';
import { authResendCode, authVerifyEmail } from '@/lib/backend';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function VerifyEmailScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' && params.email ? params.email : 'your email';
  const a = ONBOARDING.auth;

  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length < CODE_LENGTH) {
      setError(a.errors.wrongCode);
      return;
    }
    setVerifying(true);
    try {
      await authVerifyEmail(code);
      router.replace('/onboarding');
    } catch {
      setError(a.errors.wrongCode);
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    void authResendCode().catch(() => {});
    setCountdown(RESEND_SECONDS);
    setCode('');
    setError('');
  };

  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => code[i] ?? '');

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <BackChevron />

        <Animated.Text entering={enterUp(0)} style={[styles.title, { color: colors.textPrimary }]}>
          {a.titles.verify}
        </Animated.Text>
        <Animated.Text entering={enterUp(1)} style={[styles.helper, { color: colors.textSecondary }]}>
          {a.helpers.verify.replace('{email}', email)}
        </Animated.Text>

        {/* One hidden input drives six visible digit cells (paste + autofill friendly). */}
        <Animated.View entering={enterUp(2)}>
          <Pressable style={styles.cells} onPress={() => inputRef.current?.focus()}>
            {digits.map((d, i) => {
              const active = i === Math.min(code.length, CODE_LENGTH - 1);
              return (
                <View
                  key={i}
                  style={[
                    styles.cell,
                    { backgroundColor: colors.raised, borderColor: active ? colors.accent : colors.outline },
                  ]}
                >
                  <Text style={[styles.cellText, { color: colors.textPrimary }]}>{d}</Text>
                </View>
              );
            })}
          </Pressable>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(t) => {
              setError('');
              setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH));
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoFocus
            maxLength={CODE_LENGTH}
            style={styles.hiddenInput}
            accessibilityLabel="Verification code"
          />
        </Animated.View>

        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        <Animated.View entering={enterUp(3)} style={styles.resendRow}>
          <Pressable onPress={handleResend} disabled={countdown > 0} hitSlop={8}>
            <Text
              style={[
                styles.resend,
                { color: countdown > 0 ? colors.textTertiary : colors.accent },
              ]}
            >
              {countdown > 0 ? a.helpers.resendCountdown.replace('{n}', String(countdown)) : a.helpers.resend}
            </Text>
          </Pressable>
        </Animated.View>

        <View style={[styles.action, { paddingBottom: insets.bottom + SPACE.lg }]}>
          <Button
            label={a.ctas.verify}
            onPress={() => void handleVerify()}
            loading={verifying}
            disabled={code.length < CODE_LENGTH}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: SPACE.xl, gap: SPACE.md },
  title: { ...TYPE.headline, marginTop: SPACE.sm },
  helper: { ...TYPE.body, fontSize: 15, lineHeight: 22 },
  cells: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm },
  cell: {
    flex: 1,
    aspectRatio: 0.82,
    borderRadius: RADIUS.edit,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontFamily: FONTS.body.semibold, fontSize: 24 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  error: { fontFamily: FONTS.body.regular, fontSize: 14, textAlign: 'center' },
  resendRow: { alignItems: 'center' },
  resend: { fontFamily: FONTS.body.semibold, fontSize: 14, paddingVertical: SPACE.xs },
  action: { marginTop: 'auto' },
});
