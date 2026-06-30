// Help / support — a short FAQ list-group + a quiet Contact support footer. Calm utility.
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { PressableScale } from '@/components/motion';
import { HELP, withAppName } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export default function HelpScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Help</Text>
        <ListGroup>
          {HELP.faq.map((item, i) => (
            <ListRow key={item.topic} first={i === 0} label={withAppName(item.question)} onPress={() => {}} />
          ))}
        </ListGroup>
        <PressableScale
          haptic="light"
          onPress={() => Linking.openURL('mailto:support@aura.app').catch(() => {})}
          style={styles.contactBtn}
        >
          <Text style={[styles.contact, { color: colors.textSecondary }]}>{HELP.contact}</Text>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { gap: SPACE.md },
  title: { ...TYPE.headline, marginBottom: SPACE.xs },
  contactBtn: { alignItems: 'center', paddingVertical: SPACE.md, marginTop: SPACE.sm },
  contact: { fontFamily: FONTS.body.medium, fontSize: 14 },
});
