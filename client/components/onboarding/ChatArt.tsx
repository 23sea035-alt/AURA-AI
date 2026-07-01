// Slide 2 hero — "a calm, private place to talk." A warm call-and-response: the companion's
// bubble eases in first (upper-left, warm sand paper), a beat later your reply eases in
// (lower-right, soft clay/terracotta) — two distinct warm voices, no accent color. Privacy reads
// through emptiness + intimacy: just the two, close and cozy in open warm space, never caged in
// a container. Ported from docs/redesign/claude-design/onboarding-app.jsx ChatArt.
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

import { impact, ImpactFeedbackStyle } from '@/utils/haptics';

import { COMPANION_BUBBLE, USER_BUBBLE, WarmBubble } from './WarmBubble';

type Props = { dark: boolean; playKey: number; active: boolean; reduceMotion: boolean };

export function ChatArt({ dark, playKey, active, reduceMotion }: Props) {
  // soft completion haptic as YOUR reply lands (the exchange completing)
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => impact(ImpactFeedbackStyle.Light), reduceMotion ? 80 : 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, playKey]);

  return (
    <View style={styles.stage}>
      <WarmBubble
        id={`them-${playKey}`}
        preset={COMPANION_BUBBLE}
        dark={dark}
        left={28}
        top={38}
        rotateDeg={-1.4}
        lineWidths={[80, 52]}
        delayMs={150}
        playKey={playKey}
        active={active}
        reduceMotion={reduceMotion}
      />
      <WarmBubble
        id={`you-${playKey}`}
        preset={USER_BUBBLE}
        dark={dark}
        left={162}
        top={100}
        rotateDeg={1.6}
        lineWidths={[58]}
        delayMs={550}
        playKey={playKey}
        active={active}
        reduceMotion={reduceMotion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 320, height: 200, position: 'relative' },
});
