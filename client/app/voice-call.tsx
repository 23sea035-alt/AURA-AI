// Voice call — the second hero moment. The companion's presence sits large and
// breathing in the room; tonal rings (never glow) carry the call state:
// listening = a ring that swells gently with the voice, thinking = a slow
// opacity pulse, speaking = soft concentric ripples. Captions (optional, from
// voice preferences) write themselves in with the same typing reveal as chat.
//
// LIVE mode drives these states from the voice WebSocket via useVoiceCall (Apple-VAD
// utterances up as binary frames; per-sentence Inworld MP3 + voice_caption back down —
// docs/specs/chat-system-design.md §3). Mock mode keeps the timer loop below, so the
// demo story needs no server. mockVoiceReply() stands in for the streamed reply text.
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

import { Button } from '@/components/Button';
import { RevealingText } from '@/components/chat';
import { CompanionPresence } from '@/components/companion/CompanionPresence';
import { PressableScale, enterUp } from '@/components/motion';
import { CHAT } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE, personaToneFor } from '@/constants/design';
import { DURATION, EASING, TYPING } from '@/constants/motion';
import { DEV_USE_MOCKS } from '@/constants/devFlags';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { useVoicePrefs } from '@/hooks/useVoicePrefs';
import { VOICE_FREE_SECONDS, VOICE_PREMIUM_SECONDS, mockVoiceReply } from '@/lib/backend';

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

const GREETING = "Hi, it's me. I'm right here. What's on your mind?";

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VoiceCallScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { companions, user, voiceUsage, addVoiceSeconds } = useApp();
  const { prefs } = useVoicePrefs();

  const companion = companions.find((c) => c.id === id) ?? companions[0];
  const cid = companion?.id ?? 'aurora';
  const name = companion?.name ?? 'Aurora';
  const tone = personaToneFor(mode, cid);
  const ringColor = tone?.deep ?? colors.accent;

  // Voice metering — the paywall promise (20 min/month free, 10 h/month premium).
  // Snapshot the remaining budget at mount; the meter itself lives in context.
  const isPremium = !!user?.isPremium;
  const capSeconds = isPremium ? VOICE_PREMIUM_SECONDS : VOICE_FREE_SECONDS;
  const remainingAtMount = useRef(Math.max(0, capSeconds - voiceUsage.seconds));
  const [outOfTime, setOutOfTime] = useState(remainingAtMount.current <= 0);

  const [state, setState] = useState<CallState>('connecting');
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const turn = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  // LIVE call loop (mock mode keeps the timer loop below).
  const liveVoice = !DEV_USE_MOCKS && !!companion && !cid.startsWith('local-');
  const live = useVoiceCall({ companionId: cid, enabled: liveVoice && !outOfTime, muted });
  const serverBudgetSet = useRef(false);

  useEffect(() => {
    if (!liveVoice) return;
    if (live.state === 'limit') {
      setOutOfTime(true);
      return;
    }
    if (live.state === 'error') {
      // The socket died or voice never came up — leave the room calmly.
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.back();
      return;
    }
    setState(live.state);
    setCaption(live.caption);
  }, [liveVoice, live.state, live.caption]);

  // First voice_ready carries the server-authoritative monthly budget — it wins over the
  // local mirror (once; later readies already discount this call's own metered seconds).
  useEffect(() => {
    if (!liveVoice || live.remainingSeconds == null || serverBudgetSet.current) return;
    serverBudgetSet.current = true;
    remainingAtMount.current = Math.max(0, live.remainingSeconds);
    if (live.remainingSeconds <= 0) setOutOfTime(true);
  }, [liveVoice, live.remainingSeconds]);

  // Elapsed clock — also enforces the cap mid-call (calm cutoff, never abrupt UI).
  useEffect(() => {
    if (outOfTime) return;
    const t = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= remainingAtMount.current) {
          setOutOfTime(true);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [outOfTime]);

  // Metering seam: on leaving the call, book the elapsed seconds (the real
  // server meters voice_usage itself; this mirrors it client-side).
  useEffect(() => {
    return () => addVoiceSeconds(elapsedRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reaching the cap stops the mocked loop.
  useEffect(() => {
    if (outOfTime && timer.current) {
      clearTimeout(timer.current);
      setCaption(null);
    }
  }, [outOfTime]);

  // The mocked call loop (mock mode only). Each step schedules the next; mute holds in `listening`.
  useEffect(() => {
    if (liveVoice || outOfTime) return;
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

  }, [cid, outOfTime, liveVoice]);

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
        <Text style={[styles.marker, { color: colors.textSecondary }]}>
          {CHAT.aiMarker.toUpperCase()} · VOICE
        </Text>
        <Text style={[styles.clock, { color: colors.textSecondary }]}>{formatElapsed(elapsed)}</Text>
      </Animated.View>

      {outOfTime ? (
        // Voice-minutes cap — gentle, never a hard wall: the presence stays, chat
        // stays open, and the meter renews monthly (paywall promise).
        <>
          <View style={styles.stage}>
            <CompanionPresence
              // Persona key, not the row id — live rows have server UUIDs (same rule as Home).
              id={companion?.personaKey ?? cid}
              name={name}
              size={PRESENCE_SIZE}
              colorFrom={companion?.colorFrom}
              colorTo={companion?.colorTo}
              lookId={companion?.lookId}
            />
            <Animated.View entering={FadeIn.duration(DURATION.normal)} style={styles.limitBlock}>
              <Text style={[styles.limitTitle, { color: colors.textPrimary }]}>{CHAT.voiceLimit.title}</Text>
              <Text style={[styles.limitBody, { color: colors.textSecondary }]}>
                {(isPremium ? CHAT.voiceLimit.bodyPremium : CHAT.voiceLimit.body).replace('{Companion}', name)}
              </Text>
            </Animated.View>
          </View>
          <View style={[styles.limitActions, { paddingBottom: insets.bottom + SPACE.xl }]}>
            {!isPremium ? (
              <Button label={CHAT.voiceLimit.cta} onPress={() => router.push('/premium')} />
            ) : null}
            <PressableScale haptic="light" onPress={endCall} style={styles.limitDone}>
              <Text style={[styles.limitDoneText, { color: colors.textSecondary }]}>{CHAT.voiceLimit.done}</Text>
            </PressableScale>
          </View>
        </>
      ) : (
        <>
          {/* The presence + its state ring. */}
          <View style={styles.stage}>
            <View style={styles.ringStack}>
              {state === 'speaking' ? <Ripples color={ringColor} /> : null}
              {state === 'listening' && !muted ? <ListeningRing color={ringColor} /> : null}
              {state === 'thinking' || state === 'connecting' ? <PulseRing color={ringColor} /> : null}
              <CompanionPresence
                id={companion?.personaKey ?? cid}
                name={name}
                size={PRESENCE_SIZE}
                colorFrom={companion?.colorFrom}
                colorTo={companion?.colorTo}
                lookId={companion?.lookId}
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
        </>
      )}
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
  limitBlock: { alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.md },
  limitTitle: { ...TYPE.title, textAlign: 'center' },
  limitBody: { ...TYPE.body, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  limitActions: { gap: SPACE.sm },
  limitDone: { alignItems: 'center', paddingVertical: SPACE.md },
  limitDoneText: { ...TYPE.label },
});
