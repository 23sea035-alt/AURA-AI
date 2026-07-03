// 404 — warm, quiet, and honest; one path home.
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>This page wandered off.</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          The screen you were looking for isn&apos;t here.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.accent }]}>Take me home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE.xl,
    gap: SPACE.sm,
  },
  title: { ...TYPE.title, textAlign: 'center' },
  body: { ...TYPE.body, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  link: { marginTop: SPACE.md, paddingVertical: SPACE.md },
  linkText: { ...TYPE.label },
});
