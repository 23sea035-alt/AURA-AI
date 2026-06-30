// Sign-in & security — the account's sign-in method. Email (read-only) + change password. (SSO
// connection state is shown here too once Clerk is wired; for now it's the email/password path.)
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

const DEMO_EMAIL = 'maya.chen@example.com';

export default function SignInSecurityScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const email = user?.email || DEMO_EMAIL;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Sign-in & security</Text>

        <ListGroup label="Email">
          <ListRow first label={email} />
        </ListGroup>

        <ListGroup label="Password">
          <ListRow first label="Change password" onPress={() => router.push('/(auth)/forgot-password')} />
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { gap: SPACE.lg },
  title: { ...TYPE.headline, marginBottom: SPACE.xs },
});
