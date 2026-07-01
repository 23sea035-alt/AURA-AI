// Post-auth intro carousel — a short 3-screen narrative (stories idiom: segmented progress,
// swipe/tap to advance). NEVER auto-advances (the user owns the pace). Skip + Continue.
// Replaces the cosmic "Meet Your AI Companion" intro.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PressableScale, enterUp } from '@/components/motion';
import { ChatArt } from '@/components/onboarding/ChatArt';
import { PresenceArt } from '@/components/onboarding/PresenceArt';
import { ThreadArt } from '@/components/onboarding/ThreadArt';
import { ONBOARDING } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

export default function CarouselScreen() {
  const { colors, mode } = useTheme();
  const dark = mode === 'dark';
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  // Bumped each time a slide lands (including the first, on mount) so its hero art + text replay.
  const [playKey, setPlayKey] = useState(0);
  useEffect(() => setPlayKey((k) => k + 1), [index]);
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

  // Tap-zone browsing (ported from ../Amibroke's story carousel): left/right halves of the slide
  // step back/forward and loop at the ends, independent of "Continue" — which always means "leave
  // the carousel" once you're on the last slide, not "loop around". A wrap (last -> first or
  // first -> last) jumps instantly instead of animating, so it doesn't visually travel back
  // through the middle slide.
  //
  // For an animated move, `index` (and so the progress bar + hero replay) updates via the same
  // onMomentumScrollEnd handler a real swipe already drives — NOT synchronously here. Setting it
  // synchronously flips the progress bar (and re-renders the outgoing slide's art as `active:
  // false`) up to half a second before the ScrollView visually moves at all, which reads as the
  // outgoing slide's art snapping to its resting frame while it's still sitting fully on-screen.
  // A wrap has no animation to wait for, so it updates index immediately alongside the jump.
  const goToSlide = (i: number) => {
    const wrapped = (i + copy.slides.length) % copy.slides.length;
    const isWrap = Math.abs(wrapped - index) > 1;
    scrollRef.current?.scrollTo({ x: wrapped * width, animated: !isWrap });
    if (isWrap) setIndex(wrapped);
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
        {copy.slides.map((slide, i) => {
          const active = index === i;
          return (
            <View key={i} style={[styles.slide, { width }]}>
              {/* Doctrine: no accent-tinted tile — the art floats in open warm space. Fixed-height
                  zone (= tallest art) so the headline baseline stays put across slides. */}
              <View style={styles.illo}>
                {i === 0 ? (
                  <ThreadArt dark={dark} playKey={playKey} active={active} reduceMotion={reduceMotion} />
                ) : i === 1 ? (
                  <ChatArt dark={dark} playKey={playKey} active={active} reduceMotion={reduceMotion} />
                ) : (
                  <PresenceArt dark={dark} playKey={playKey} active={active} reduceMotion={reduceMotion} />
                )}
              </View>
              <Animated.View key={active ? `h${i}-${playKey}` : `hs${i}`} entering={active ? enterUp(0) : undefined}>
                <Text style={[styles.headline, { color: colors.textPrimary }]}>{slide.headline}</Text>
              </Animated.View>
              <Animated.View key={active ? `s${i}-${playKey}` : `ss${i}`} entering={active ? enterUp(1) : undefined}>
                <Text style={[styles.support, { color: colors.textSecondary }]}>{slide.support}</Text>
              </Animated.View>
              <Pressable
                style={[styles.tapZone, styles.tapLeft]}
                onPress={() => goToSlide(index - 1)}
                accessibilityRole="button"
                accessibilityLabel="Previous slide"
              />
              <Pressable
                style={[styles.tapZone, styles.tapRight]}
                onPress={() => goToSlide(index + 1)}
                accessibilityRole="button"
                accessibilityLabel="Next slide"
              />
            </View>
          );
        })}
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
  slide: { position: 'relative', alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.xl, gap: SPACE.lg },
  tapZone: { position: 'absolute', top: 0, bottom: 0 },
  tapLeft: { left: 0, width: '50%' },
  tapRight: { right: 0, width: '50%' },
  illo: { height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.md },
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
