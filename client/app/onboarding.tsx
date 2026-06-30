// Post-auth intro carousel — a short 3-screen narrative (stories idiom: segmented progress,
// swipe/tap to advance). NEVER auto-advances (the user owns the pace). Skip + Continue.
// Replaces the cosmic "Meet Your AI Companion" intro.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PressableScale } from '@/components/motion';
import { ONBOARDING } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

const SLIDE_ICONS: React.ComponentProps<typeof Ionicons>['name'][] = [
  'infinite-outline',
  'shield-checkmark-outline',
  'moon-outline',
];

export default function CarouselScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const copy = ONBOARDING.carousel;
  const last = copy.slides.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const goNext = () => {
    if (index < last) scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    else router.push('/age-verification');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      <View style={styles.progress}>
        {copy.slides.map((_, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i <= index ? colors.accent : colors.border }]} />
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.flex}
      >
        {copy.slides.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={[styles.illo, { backgroundColor: colors.accentTint }]}>
              <Ionicons name={SLIDE_ICONS[i]} size={64} color={colors.accent} />
            </View>
            <Text style={[styles.headline, { color: colors.textPrimary }]}>{slide.headline}</Text>
            <Text style={[styles.support, { color: colors.textSecondary }]}>{slide.support}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACE.lg }]}>
        <PressableScale onPress={() => router.push('/age-verification')} haptic="light" style={styles.skip}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>{copy.skip}</Text>
        </PressableScale>
        <View style={styles.cta}>
          <Button label={`${copy.next} →`} onPress={goNext} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  progress: { flexDirection: 'row', gap: SPACE.xs, paddingHorizontal: SPACE.xl, marginBottom: SPACE.md },
  segment: { flex: 1, height: 3, borderRadius: 2 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xl, gap: SPACE.lg },
  illo: { width: 176, height: 176, borderRadius: RADIUS.card, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.md },
  headline: { ...TYPE.headline, textAlign: 'center' },
  support: { ...TYPE.body, textAlign: 'center', maxWidth: 320 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.lg,
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.md,
  },
  skip: { paddingVertical: SPACE.sm },
  skipText: { fontFamily: FONTS.body.medium, fontSize: 15 },
  cta: { flex: 1 },
});
