// Notifications — transactional only (no marketing). One push toggle for "companion replied", on by
// default, with explanatory copy. Replaces the cosmic notifications screen.
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { ACCOUNT } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function NotificationsScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { companions } = useApp();
  const companion = companions[0]?.name ?? 'Aurora';
  const [on, setOn] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
        <ListGroup>
          <ListRow
            first
            label={ACCOUNT.notifications.toggleLabel.replace('{Companion}', companion)}
            toggle={{ value: on, onValueChange: setOn }}
          />
        </ListGroup>
        <Text style={[styles.helper, { color: colors.textSecondary }]}>{ACCOUNT.notifications.helper}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { gap: SPACE.md },
  title: { ...TYPE.headline, marginBottom: SPACE.xs },
  helper: { fontFamily: FONTS.body.regular, fontSize: 13, lineHeight: 18, marginLeft: SPACE.xs },
});
