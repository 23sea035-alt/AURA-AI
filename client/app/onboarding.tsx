// Post-auth intro carousel — a short 3-screen narrative (stories idiom: segmented progress,
// swipe/tap to advance). NEVER auto-advances (the user owns the pace). Skip + Continue.
// Replaces the cosmic "Meet Your AI Companion" intro.
//
// Only the CURRENT slide is ever mounted (ported from ../Amibroke's story carousel, which does the
// same) — there's no ScrollView carrying all three slides side by side. An earlier version tried
// to keep a real, physically-swipeable ScrollView and synchronize each slide's own entrance
// animation with the live scroll position, so a slide already sitting fully-formed off-screen
// wouldn't flash into view and then visibly reset+replay once it became "active". Every attempt at
// that synchronization (deferring state to momentum-end, co-locating state updates, then driving
// entrance timing off a continuously-updating onScroll) fixed one failure mode and surfaced
// another, and the continuous onScroll listener made the drag itself feel laggy. Mounting only the
// current slide sidesteps the whole class of bugs: a slide's entrance effect runs once, on mount,
// and there's no prior "already fully rendered" frame for it to flash. The tradeoff is losing a
// real finger-tracked horizontal drag — advancing is tap-zones (unchanged) plus a swipe gesture
// that commits to next/prev on release rather than following the finger live.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { PressableScale, enterUp } from '@/components/motion';
import { ChatArt } from '@/components/onboarding/ChatArt';
import { PresenceArt } from '@/components/onboarding/PresenceArt';
import { ThreadArt } from '@/components/onboarding/ThreadArt';
import { ONBOARDING } from '@/constants/content';
import { FONTS, SPACE, TYPE } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';

const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 700;

export default function CarouselScreen() {
  const { colors, mode } = useTheme();
  const dark = mode === 'dark';
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const copy = ONBOARDING.carousel;
  const last = copy.slides.length - 1;

  const goToSlide = (i: number) => setIndex((i + copy.slides.length) % copy.slides.length);

  const goNext = () => {
    if (index < last) setIndex(index + 1);
    else router.push('/age-verification');
  };

  // Swipe-to-advance: commits to the next/prev slide on release rather than tracking the finger
  // live (see file header) — activeOffsetX so a quick tap still falls through to the tap zones.
  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      'worklet';
      const passed = e.translationX < -SWIPE_DISTANCE || e.velocityX < -SWIPE_VELOCITY;
      const wentBack = e.translationX > SWIPE_DISTANCE || e.velocityX > SWIPE_VELOCITY;
      if (passed) runOnJS(goToSlide)(index + 1);
      else if (wentBack) runOnJS(goToSlide)(index - 1);
    });

  const slide = copy.slides[index];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.md }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      <View style={styles.progress}>
        {copy.slides.map((_, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i <= index ? colors.accent : colors.border }]} />
        ))}
      </View>

      <GestureDetector gesture={swipe}>
        <View style={styles.slide}>
          <Animated.View key={index} entering={enterUp(0)} style={styles.slideInner}>
            {/* Doctrine: no accent-tinted tile — the art floats in open warm space. Fixed-height
                zone (= tallest art) so the headline baseline stays put across slides. */}
            <View style={styles.illo}>
              {index === 0 ? (
                <ThreadArt dark={dark} reduceMotion={reduceMotion} />
              ) : index === 1 ? (
                <ChatArt dark={dark} reduceMotion={reduceMotion} />
              ) : (
                <PresenceArt dark={dark} reduceMotion={reduceMotion} />
              )}
            </View>
            <Text style={[styles.headline, { color: colors.textPrimary }]}>{slide.headline}</Text>
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
      </GestureDetector>

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
  progress: { flexDirection: 'row', gap: SPACE.xs, paddingHorizontal: SPACE.xl, marginBottom: SPACE.md },
  segment: { flex: 1, height: 3, borderRadius: 2 },
  slide: { flex: 1, position: 'relative' },
  slideInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.xl,
    gap: SPACE.lg,
  },
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
