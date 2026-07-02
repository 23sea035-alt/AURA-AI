// Notifications — transactional only (no marketing). One push toggle for "companion replied", on by
// default, with explanatory copy. Replaces the cosmic notifications screen.
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { TopBar } from '@/components/TopBar';
import { ACCOUNT } from '@/constants/content';
import { SPACE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function NotificationsScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { companions } = useApp();
  const companion = companions[0]?.name ?? 'Aurora';
  const [on, setOn] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <TopBar title="Notifications" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <ListGroup label={ACCOUNT.notifications.group} footnote={ACCOUNT.notifications.footnote}>
          <ListRow
            first
            label={ACCOUNT.notifications.toggleLabel.replace('{Companion}', companion)}
            sub={ACCOUNT.notifications.sub}
            toggle={{ value: on, onValueChange: setOn }}
          />
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: SPACE.md, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
});
