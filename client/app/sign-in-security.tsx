// Sign-in & security — how you sign in (method card) + email/password. Conditional on the sign-in
// method: email/password → editable; Google/Apple SSO → read-only ("Managed by {provider}"), since
// the identity provider owns the credentials. Apple Hide-My-Email shows the relay + a forwarding note.
// In the real app the method comes from Clerk; until then the app uses local email/password.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoogleG } from '@/components/GoogleG';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { TopBar } from '@/components/TopBar';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

const DEMO_EMAIL = 'maya.chen@example.com';

type Method = 'password' | 'google' | 'apple' | 'apple-hidden';
// Local email/password until Clerk is wired (externalAccounts / passwordEnabled drives this then).
const METHOD: Method = 'password';

export default function SignInSecurityScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useApp();

  const method = METHOD;
  const sso = method !== 'password';
  const provider = method === 'google' ? 'Google' : 'Apple';
  const hidden = method === 'apple-hidden';
  const email =
    method === 'google'
      ? 'maya.chen@gmail.com'
      : method === 'apple'
        ? 'maya.chen@icloud.com'
        : hidden
          ? 'qp7k3m9x2c@privaterelay.appleid.com'
          : user?.email || DEMO_EMAIL;
  const emailNote = !sso
    ? 'We use this to reach you about your account.'
    : hidden
      ? 'Apple hides your real address and forwards messages to your inbox. Manage it in your Apple ID settings.'
      : `Your email comes from your ${provider} account. Change it there and it updates here.`;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <TopBar title="Sign-in & security" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* How you sign in */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>How you sign in</Text>
          <View style={[styles.methodCard, { backgroundColor: colors.sheet, borderColor: colors.border }]}>
            <View style={[styles.methodGlyph, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              {method === 'google' ? (
                <GoogleG size={17} />
              ) : sso ? (
                <Ionicons name="logo-apple" size={17} color={colors.textPrimary} />
              ) : (
                <Ionicons name="mail-outline" size={17} color={colors.textSecondary} />
              )}
            </View>
            <Text style={[styles.methodLabel, { color: colors.textPrimary }]}>
              {sso ? `Signed in with ${provider}` : 'Email & password'}
            </Text>
          </View>
        </View>

        {/* Email — editable for email/password; read-only "Managed by {provider}" for SSO */}
        <View style={styles.section}>
          <ListGroup label="Email">
            {sso ? <ListRow first label={email} detail={`Managed by ${provider}`} /> : <ListRow first label={email} />}
          </ListGroup>
          <Text style={[styles.footnote, { color: colors.textTertiary }]}>{emailNote}</Text>
        </View>

        {/* Password — change for email/password; managed by the provider for SSO */}
        <ListGroup label="Password">
          {sso ? (
            <ListRow first label="Password" detail={`Managed by ${provider}`} />
          ) : (
            <ListRow first label="Change password" onPress={() => router.push('/(auth)/forgot-password')} />
          )}
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Full-height scroll viewport even when under-filled — otherwise the area
  // below short content is dead to swipes (same fix as companions.tsx).
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: SPACE.lg, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
  section: { gap: SPACE.sm },
  sectionLabel: { fontFamily: FONTS.body.semibold, fontSize: 13, marginLeft: SPACE.xs },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.soft,
    padding: SPACE.lg,
  },
  methodGlyph: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodLabel: { flex: 1, fontFamily: FONTS.body.semibold, fontSize: 15 },
  footnote: { ...TYPE.caption, lineHeight: 17, marginLeft: SPACE.xs },
});
