// Home — the companion's room (NOT a dashboard). Warm greeting, the companion present and large,
// one loud "Continue your conversation" CTA. Presence is placed on entry, then holds still.
// TODO: resurfaced-memory chip + free 18/30 usage indicator (need the "remembers" + usage wiring).
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { enterUp } from '@/components/motion';
import { CHAT, HOME } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

function greetingFor(hour: number): string {
  if (hour < 12) return HOME.greetings.morning;
  if (hour < 18) return HOME.greetings.afternoon;
  return HOME.greetings.evening;
}

export default function HomeScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, companions } = useApp();
  const companion = companions[0];
  const firstName = user?.name?.trim().split(' ')[0] || 'there';
  const greeting = greetingFor(new Date().getHours());
  const isEmpty = !companion?.messageCount;

  if (!companion) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACE.xl, paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text entering={enterUp(0)} style={[styles.greeting, { color: colors.textPrimary }]}>
          {greeting}, {firstName}
        </Animated.Text>

        <Animated.View entering={enterUp(1)} style={styles.presence}>
          <Avatar id={companion.id} name={companion.name} size={132} />
          <Text style={[styles.name, { color: colors.textPrimary }]}>{companion.name}</Text>
          <Text style={[styles.marker, { color: colors.textTertiary }]}>{CHAT.aiMarker}</Text>
        </Animated.View>

        {isEmpty ? (
          <Animated.Text entering={FadeIn.delay(200)} style={[styles.emptyLine, { color: colors.textSecondary }]}>
            {HOME.empty.line.replace('{Companion}', companion.name)}
          </Animated.Text>
        ) : null}

        <Animated.View entering={FadeIn.delay(250)} style={styles.cta}>
          <Button
            label={`${isEmpty ? HOME.empty.cta : HOME.cta} →`}
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: companion.id } })}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SPACE.xl, alignItems: 'center' },
  greeting: { ...TYPE.headline, alignSelf: 'stretch', marginBottom: SPACE.xxl },
  presence: { alignItems: 'center', gap: SPACE.sm },
  name: { ...TYPE.title, marginTop: SPACE.sm },
  marker: { fontFamily: FONTS.body.medium, fontSize: 12 },
  emptyLine: { ...TYPE.body, textAlign: 'center', marginTop: SPACE.lg, maxWidth: 300 },
  cta: { alignSelf: 'stretch', marginTop: SPACE.xxl },
});
