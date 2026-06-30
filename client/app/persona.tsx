// Choose your companion — the pivotal choice (CHOOSE, not build). Three warm stacked cards
// (Aurora / Orion / Lyra) with the curated avatar + a one-line voice; Aurora pre-highlighted.
// Selecting rises the card (e1 -> e2 + wine ring) and recedes the rest. CTA names the choice.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackChevron } from '@/components/BackChevron';
import { Button } from '@/components/Button';
import { PressableScale, enterUp } from '@/components/motion';
import { ONBOARDING, PERSONAS } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

const AVATARS = {
  Aurora: require('../assets/avatars/aurora.png'),
  Orion: require('../assets/avatars/orion.png'),
  Lyra: require('../assets/avatars/lyra.png'),
};
const ORDER = ['Aurora', 'Orion', 'Lyra'] as const;
type PersonaName = (typeof ORDER)[number];

export default function PersonaScreen() {
  const { colors, shadows, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<PersonaName>('Aurora');
  const copy = ONBOARDING.persona;

  const handleStart = () => {
    router.push({ pathname: '/firstchat', params: { companion: selected } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <BackChevron />
        <Animated.Text entering={enterUp(0)} style={[styles.title, { color: colors.textPrimary }]}>
          {copy.title}
        </Animated.Text>
        <Animated.Text entering={enterUp(1)} style={[styles.sub, { color: colors.textSecondary }]}>
          {copy.sub}
        </Animated.Text>

        {ORDER.map((name, i) => {
          const persona = PERSONAS[name];
          const isSel = selected === name;
          return (
            <Animated.View key={name} entering={enterUp(i + 2)}>
              <PressableScale
                haptic="medium"
                onPress={() => setSelected(name)}
                style={[
                  styles.card,
                  { backgroundColor: colors.raised },
                  isSel
                    ? { ...shadows.e2, borderColor: colors.accent, borderWidth: 1.5 }
                    : { ...shadows.e1, borderColor: 'transparent', borderWidth: 1.5, opacity: 0.65 },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSel }}
              >
                <Image source={AVATARS[name]} style={styles.avatar} contentFit="cover" />
                <View style={styles.cardText}>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>{persona.name}</Text>
                  <Text style={[styles.voice, { color: colors.textSecondary }]}>{persona.voice}</Text>
                </View>
              </PressableScale>
            </Animated.View>
          );
        })}

        <Animated.Text entering={enterUp(5)} style={[styles.premium, { color: colors.textTertiary }]}>
          {copy.premiumNote}
        </Animated.Text>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + SPACE.lg, backgroundColor: colors.bg, borderTopColor: colors.divider },
        ]}
      >
        <Button label={`${copy.ctaTemplate.replace('{Companion}', selected)} →`} onPress={handleStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  content: { gap: SPACE.md },
  title: { ...TYPE.headline },
  sub: { ...TYPE.body, marginBottom: SPACE.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.lg,
    borderRadius: RADIUS.card,
    padding: SPACE.lg,
  },
  avatar: { width: 64, height: 64, borderRadius: RADIUS.pill },
  cardText: { flex: 1, gap: 4 },
  name: { fontFamily: FONTS.body.semibold, fontSize: 18 },
  voice: { fontFamily: FONTS.body.regular, fontSize: 15, lineHeight: 20 },
  premium: { ...TYPE.caption, textAlign: 'center', marginTop: SPACE.sm },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
