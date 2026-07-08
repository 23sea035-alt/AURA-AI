// Notifications — transactional only (no marketing). One push toggle for "companion replied", on by
// default, with explanatory copy. Persisted locally; enabling registers the APNs device token
// (POST /api/notifications/register), disabling unregisters it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { TopBar } from '@/components/TopBar';
import { ACCOUNT } from '@/constants/content';
import { SPACE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { registerPushToken, unregisterPushToken } from '@/lib/backend';
import { getDeviceToken, pushPermissionGranted } from '@/lib/push';

const KEY = 'pushRepliesEnabled';
const TOKEN_KEY = 'pushToken';

export default function NotificationsScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { companions } = useApp();
  const companion = companions[0]?.name ?? 'Aurora';
  const [on, setOn] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v !== null) setOn(v === 'true');
    });
  }, []);

  const handleToggle = async (value: boolean) => {
    setOn(value);
    AsyncStorage.setItem(KEY, String(value)).catch(() => {});
    if (value) {
      // The explicit enable is the one moment we always may ask for permission. A denial
      // (or "can't ask again") flips the toggle back — the row stays honest.
      const granted = await pushPermissionGranted(true);
      if (!granted) {
        setOn(false);
        AsyncStorage.setItem(KEY, 'false').catch(() => {});
        return;
      }
      const token = await getDeviceToken();
      if (token) {
        registerPushToken(token).catch(() => {});
        AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
      }
    } else {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        unregisterPushToken(token).catch(() => {});
        AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <TopBar title="Notifications" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <ListGroup label={ACCOUNT.notifications.group} footnote={ACCOUNT.notifications.footnote}>
          <ListRow
            first
            label={ACCOUNT.notifications.toggleLabel.replace('{Companion}', companion)}
            sub={ACCOUNT.notifications.sub}
            toggle={{ value: on, onValueChange: handleToggle }}
          />
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
  content: { flexGrow: 1, gap: SPACE.md, paddingHorizontal: SPACE.xl, paddingTop: SPACE.lg },
});
