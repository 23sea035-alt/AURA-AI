// Voice call — the second hero moment. The companion's presence sits large and
// breathing in the room; tonal rings (never glow) carry the call state:
// listening = a ring that swells gently with the voice, thinking = a slow
// opacity pulse, speaking = soft concentric ripples. Captions (optional, from
// voice preferences) write themselves in with the same typing reveal as chat.
//
// WIRE SEAM: the call loop is mocked with timers — the real client drives these
// same states from the voice WebSocket (IDLE / USER_SPEAKING / PROCESSING /
// AI_SPEAKING per docs/specs/chat-system-design.md §3.4) and plays Inworld TTS
// audio. mockVoiceReply() stands in for the streamed reply text.
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing as ReEasing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RevealingText } from '@/components/chat';
import { CompanionPresence } from '@/components/companion/CompanionPresence';
import { PressableScale, enterUp } from '@/components/motion';
import { CHAT } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE, personaToneFor } from '@/constants/design';
import { DURATION, EASING, TYPING } from '@/constants/motion';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { useVoicePrefs } from '@/hooks/useVoicePrefs';
import { mockVoiceReply } from '@/lib/mock';

type CallState = 'connecting' | 'listening' | 'thinking' | 'speaking';

const PRESENCE_SIZE = 148;
const RING_SIZE = Math.round(PRESENCE_SIZE * 1.32);
// Mock pacing: how long the "user turn" lasts before the companion considers + replies.
const MOCK_LISTEN_MS = 4200;
const MOCK_THINK_MS = 1400;
const SPEAK_MS_PER_WORD = 240;

const STATE_LABEL: Record<CallState, string> = {
  connecting: 'Connecting…',
  listening: 'Listening',
  thinking: 'Thinking…',
  speaking: 'Speaking',
};

const GREETING = "Hi, it's me. I'm right here — what's on your mind?";

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VoiceCallScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { companions } = useApp();
  const { prefs } = useVoicePrefs();

  const companion = companions.find((c) => c.id === id) ?? companions[0];
  const cid = companion?.id ?? 'aurora';
  const name = companion?.name ?? 'Aurora';
  const tone = personaToneFor(mode, cid);
  const ringColor = tone?.deep ?? colors.accent;

  const [state, setState] = useState<CallState>('connecting');
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const turn = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Elapsed clock.
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // The mocked call loop. Each step schedules the next; mute holds in `listening`.
  useEffect(() => {
    const schedule = (ms: number, fn: () => void) => {
      timer.current = setTimeout(fn, ms);
    };

    const speak = (text: string) => {
      setState('speaking');
      setCaption(text);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const words = text.split(' ').length;
      const speakMs = Math.min(Math.max(words * SPEAK_MS_PER_WORD, 2200), 7000);
      schedule(speakMs, listen);
    };

    const listen = () => {
      setState('listening');
      setCaption(null);
      schedule(MOCK_LISTEN_MS, () => {
        // Muted = the mic is closed; hold here until unmuted (checked each tick).
        if (mutedRef.current) {
          listen();
          return;
        }
        setState('thinking');
        schedule(MOCK_THINK_MS, () => {
          const reply = mockVoiceReply(cid, turn.current);
          turn.current += 1;
          speak(reply);
        });
      });
    };

    schedule(900, () => speak(GREETING));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  const endCall = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + SPACE.lg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {/* Header — who you're with, honestly marked, with the elapsed clock. */}
      <Animated.View entering={enterUp(0)} style={styles.header}>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{name}</Text>
        <Text style={[styles.marker, { color: colors.textTertiary }]}>
          {CHAT.aiMarker.toUpperCase()} · VOICE
        </Text>
        <Text style={[styles.clock, { color: colors.textSecondary }]}>{formatElapsed(elapsed)}</Text>
      </Animated.View>

      {/* The presence + its state ring. */}
      <View style={styles.stage}>
        <View style={styles.ringStack}>
          {state === 'speaking' ? <Ripples color={ringColor} /> : null}
          {state === 'listening' && !muted ? <ListeningRing color={ringColor} /> : null}
          {state === 'thinking' || state === 'connecting' ? <PulseRing color={ringColor} /> : null}
          <CompanionPresence
            id={cid}
            name={name}
            size={PRESENCE_SIZE}
            colorFrom={companion?.colorFrom}
            colorTo={companion?.colorTo}
          />
        </View>

        <Text style={[styles.stateLabel, { color: colors.textSecondary }]}>
          {muted && state === 'listening' ? 'Muted' : STATE_LABEL[state]}
        </Text>

        {/* Captions — the reply writing itself, same reveal as chat. */}
        <View style={styles.captionArea}>
          {prefs.captions && caption && state === 'speaking' ? (
            <Animated.View entering={FadeIn.duration(DURATION.fast)}>
              <RevealingText
                key={caption}
                text={caption}
                style={[styles.caption, { color: colors.textPrimary }]}
              />
            </Animated.View>
          ) : null}
        </View>
      </View>

      {/* Controls — mute, end, settings. End is the one loud control. */}
      <Animated.View entering={enterUp(2)} style={[styles.controls, { paddingBottom: insets.bottom + SPACE.xl }]}>
        <ControlButton
          icon={muted ? 'mic-off' : 'mic'}
          label={muted ? 'Unmute' : 'Mute'}
          active={muted}
          onPress={() => {
            setMuted((m) => !m);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        />
        <PressableScale
          haptic="medium"
          onPress={endCall}
          accessibilityLabel="End call"
          style={[styles.endBtn, { backgroundColor: colors.error }]}
        >
          <Ionicons name="call" size={26} color={colors.onAccent} style={styles.endGlyph} />
        </PressableScale>
        <ControlButton
          icon="options-outline"
          label="Voice"
          onPress={() => router.push('/voice-preferences')}
        />
      </Animated.View>
    </View>
  );
}

// ── State rings (tonal, never glow) ─────────────────────────────────────────

function ringBase(color: string) {
  return {
    position: 'absolute' as const,
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: color,
  };
}

/** Speaking — two soft concentric ripples expanding and fading, slow and even. */
function Ripples({ color }: { color: string }) {
  const reduceMotion = useReducedMotion();
  const r1 = useSharedValue(0);
  const r2 = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const run = (v: typeof r1, delay: number) => {
      v.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: DURATION.crawl * 2, easing: ReEasing.out(ReEasing.ease) }), -1),
      );
    };
    run(r1, 0);
    run(r2, DURATION.crawl);
  }, [reduceMotion, r1, r2]);

  const style1 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + r1.value * 0.32 }],
    opacity: 0.38 * (1 - r1.value),
  }));
  const style2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + r2.value * 0.32 }],
    opacity: 0.38 * (1 - r2.value),
  }));

  if (reduceMotion) {
    // Snap-to-final: a single static ring marks "speaking" without motion.
    return <View style={[ringBase(color), { transform: [{ scale: 1.16 }], opacity: 0.3 }]} />;
  }
  return (
    <>
      <Animated.View style={[ringBase(color), style1]} />
      <Animated.View style={[ringBase(color), style2]} />
    </>
  );
}

/** Listening — one ring swelling gently with the (mock) voice level. */
function ListeningRing({ color }: { color: string }) {
  const reduceMotion = useReducedMotion();
  const level = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    level.value = withRepeat(
      withSequence(
        withTiming(1, { duration: DURATION.slow, easing: EASING.ambient }),
        withTiming(0.25, { duration: DURATION.normal, easing: EASING.ambient }),
        withTiming(0.7, { duration: DURATION.slow, easing: EASING.ambient }),
        withTiming(0, { duration: DURATION.normal, easing: EASING.ambient }),
      ),
      -1,
    );
  }, [reduceMotion, level]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1.04 + level.value * 0.08 }],
    opacity: 0.5,
  }));

  if (reduceMotion) {
    return <View style={[ringBase(color), { transform: [{ scale: 1.08 }], opacity: 0.5 }]} />;
  }
  return <Animated.View style={[ringBase(color), style]} />;
}

/** Thinking / connecting — the ring holds size and breathes in opacity only. */
function PulseRing({ color }: { color: string }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0.2);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.35;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: DURATION.crawl, easing: EASING.ambient }),
        withTiming(0.2, { duration: DURATION.crawl, easing: EASING.ambient }),
      ),
      -1,
    );
  }, [reduceMotion, pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[ringBase(color), { transform: [{ scale: 1.1 }] }, style]} />;
}

// ── Controls ────────────────────────────────────────────────────────────────

function ControlButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.control}>
      <PressableScale
        haptic="light"
        onPress={onPress}
        accessibilityLabel={label}
        style={[
          styles.controlBtn,
          active
            ? { backgroundColor: colors.accentTint, borderColor: 'transparent' }
            : { backgroundColor: colors.raised, borderColor: colors.border },
        ]}
      >
        <Ionicons name={icon} size={22} color={active ? colors.accent : colors.textPrimary} />
      </PressableScale>
      <Text style={[styles.controlLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACE.xl },
  header: { alignItems: 'center', gap: SPACE.xs },
  name: { ...TYPE.headline },
  marker: { ...TYPE.caption, fontFamily: FONTS.body.semibold, letterSpacing: 1 },
  clock: { ...TYPE.label, fontVariant: ['tabular-nums'], marginTop: SPACE.xs },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.lg },
  ringStack: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateLabel: { ...TYPE.label },
  captionArea: { minHeight: 84, justifyContent: 'flex-start', paddingHorizontal: SPACE.md },
  caption: { ...TYPE.body, textAlign: 'center', maxWidth: 320 },
  controls: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: SPACE.xxl,
  },
  control: { alignItems: 'center', gap: SPACE.sm },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtn: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endGlyph: { transform: [{ rotate: '135deg' }] },
  controlLabel: { ...TYPE.caption },
});
