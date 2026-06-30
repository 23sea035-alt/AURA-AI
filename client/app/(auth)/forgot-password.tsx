// Reset password — email + "we'll send a code" helper, then a calm confirmation. Back chevron to
// the previous screen. UI shell over local-auth (Clerk deferred); no real email is sent yet.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { PressableScale, enterUp } from '@/components/motion';
import { ONBOARDING } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export default function ForgotPasswordScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const a = ONBOARDING.auth;
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

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
            {sent ? a.titles.verify : a.titles.forgot}
          </Animated.Text>
          <Animated.Text entering={enterUp(1)} style={[styles.subline, { color: colors.textSecondary }]}>
            {sent ? a.helpers.verify.replace('{email}', email.trim()) : a.helpers.forgot}
          </Animated.Text>

          {!sent ? (
            <>
              <Animated.View entering={enterUp(2)} style={styles.fields}>
                <Field
                  label={a.fields.emailLabel}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={a.fields.emailPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => email.trim() && setSent(true)}
                />
              </Animated.View>
              <View style={styles.action}>
                <Button label={a.ctas.forgot} onPress={() => email.trim() && setSent(true)} disabled={!email.trim()} />
              </View>
            </>
          ) : (
            <Animated.View entering={FadeIn.duration(350)} style={styles.action}>
              <PressableScale onPress={() => router.replace('/(auth)/login')} haptic="light" style={styles.footerLink}>
                <Text style={[styles.footerText, { color: colors.accent }]}>Back to sign in</Text>
              </PressableScale>
            </Animated.View>
          )}
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
  action: { marginTop: 'auto', paddingTop: SPACE.xl, gap: SPACE.sm },
  footerLink: { alignItems: 'center', paddingVertical: SPACE.sm },
  footerText: { fontFamily: FONTS.body.semibold, fontSize: 15 },
});
