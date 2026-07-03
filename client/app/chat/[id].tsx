// Chat — the focal screen. The thread reads as chapters (serif date moments),
// the reply is the signature payoff (thinking beat → word-by-word reveal), and
// the safety chrome stays quiet: first-session banner, recurring AI notice on
// flagged turns, grounding crisis card, gentle break reminder, and a calm
// free-limit card. Runs entirely on the mock pipeline (context.sendTurn) —
// wiring the live API later only touches AppContext.
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Platform } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
// The built-in RN KeyboardAvoidingView drives its padding via LayoutAnimation, which doesn't
// ease under the New Architecture — keyboard-controller syncs via Reanimated, frame-by-frame
// with the real native keyboard animation.
import { KeyboardAvoidingView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheet from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import {
  AiNotice,
  ChatComposer,
  ChatHeader,
  DisclosureBanner,
  MessageBubble,
  ReportSheet,
  ThinkingIndicator,
  ThreadDivider,
} from '@/components/chat';
import { CrisisSupport } from '@/components/CrisisSupport';
import { PressableScale } from '@/components/motion';
import { Toast } from '@/components/Toast';
import { CHAT } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { DURATION } from '@/constants/motion';
import { type Message, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { reportMessage } from '@/lib/mock';

// Recurring SB 243 line (client-owned copy; the server decides when it fires).
const AI_NOTICE = 'Just a quiet reminder: {Companion} is an AI.';

/** Serif chapter label for a thread date. */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOf(now) - startOf(date)) / 86400000);
  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

type Row =
  | { kind: 'divider'; key: string; label: string }
  | { kind: 'message'; key: string; msg: Message };

export default function ChatScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, starter } = useLocalSearchParams<{ id: string; starter?: string }>();
  const { user, companions, getMessagesForCompanion, sendTurn, safetyState, setBreakReminder } = useApp();

  const companion = companions.find((c) => c.id === id) ?? companions[0];
  const cid = companion?.id ?? '';
  const name = companion?.name ?? 'Aurora';
  const withName = (s: string) => s.replace('{Companion}', name);

  const listRef = useRef<FlatList<Row>>(null);
  const sessionTurns = useRef(0);

  // Home's starter chips arrive pre-filled, ready to send — never auto-sent.
  const [input, setInput] = useState(typeof starter === 'string' ? starter : '');
  const [thinking, setThinking] = useState(false);
  const [revealId, setRevealId] = useState<string | null>(null);
  const [limit, setLimit] = useState<{ used: number; limit: number } | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<{ audioUri?: string } | null>(null);

  const { progress: keyboardProgress } = useReanimatedKeyboardAnimation();

  const stored = getMessagesForCompanion(cid);

  // A brand-new companion opens with a display-only greeting (never persisted —
  // the relationship starts when Maya says something).
  const messages: Message[] = useMemo(
    () =>
      stored.length > 0
        ? stored
        : [
            {
              id: 'greeting',
              role: 'assistant',
              content: `Hi, I'm ${name}. There's no script and no rush. What's on your mind?`,
              createdAt: new Date().toISOString(),
            },
          ],
    [stored, name],
  );

  // Thread rows: serif date dividers between days, then the messages.
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    let lastDay = '';
    for (const msg of messages) {
      const label = dayLabel(msg.createdAt);
      if (label !== lastDay) {
        lastDay = label;
        out.push({ kind: 'divider', key: `day-${label}-${msg.id}`, label });
      }
      out.push({ kind: 'message', key: msg.id, msg });
    }
    return out;
  }, [messages]);

  const scrollToEnd = (animated = true) => listRef.current?.scrollToEnd({ animated });

  const isReportable = (m: Message) => m.role === 'assistant' && m.id !== 'greeting';
  const openReport = (messageId: string | null) => {
    setReportTargetId(messageId);
    setReportOpen(true);
  };
  const submitReport = (reason: string, note: string) => {
    setReportOpen(false);
    // Fire-and-forget + non-punitive: never surface a report error to the user.
    if (reportTargetId) void reportMessage(reportTargetId, reason, note || undefined);
    setToast(true);
  };

  const send = async () => {
    const content = input.trim();
    if (!content || thinking) return;
    const draft = voiceDraft;
    setInput('');
    setVoiceDraft(null);
    setThinking(true);
    sessionTurns.current += 1;

    const result = await sendTurn(cid, content, sessionTurns.current, {
      inputModality: draft ? 'voice' : 'text',
      audioUri: draft?.audioUri,
    });
    setThinking(false);

    if (result.limitReached) {
      setLimit(result.limitReached);
      setInput(content); // give the blocked message back to the composer
      return;
    }
    if (result.assistant) {
      // The reveal is the payoff — a soft tick marks the reply landing.
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRevealId(result.assistant.id);
    }
  };

  const composerWrapStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(
      keyboardProgress.value,
      [0, 1],
      [insets.bottom + SPACE.sm, SPACE.md],
      Extrapolation.CLAMP,
    ),
  }));

  const showLimit = limit !== null && !user?.isPremium;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={{ paddingTop: insets.top + SPACE.sm }}>
        <ChatHeader
          id={cid}
          name={name}
          onBack={() => router.back()}
          onVoiceCall={() => router.push({ pathname: '/voice-call', params: { id: cid } })}
          onOverflow={() => setOverflowOpen(true)}
        />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          style={styles.flex}
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollToEnd()}
          ListHeaderComponent={
            safetyState.showDisclosure ? (
              <DisclosureBanner text={withName(CHAT.disclosureBanner)} />
            ) : null
          }
          renderItem={({ item }) => {
            if (item.kind === 'divider') return <ThreadDivider label={item.label} />;
            const m = item.msg;
            const revealing = m.id === revealId;
            return (
              <>
                <MessageBubble
                  role={m.role === 'user' ? 'user' : 'assistant'}
                  text={m.content}
                  audioUri={m.audioUri}
                  onLongPress={isReportable(m) ? () => openReport(m.id) : undefined}
                  reveal={revealing}
                  onRevealProgress={() => scrollToEnd(false)}
                  onRevealDone={() => setRevealId(null)}
                />
                {m.role === 'assistant' && m.aiDisclosure && !revealing ? (
                  <AiNotice text={withName(AI_NOTICE)} />
                ) : null}
                {m.role === 'assistant' && m.safetyFlagged && !revealing ? (
                  <View style={styles.crisisWrap}>
                    <CrisisSupport companion={name} />
                  </View>
                ) : null}
              </>
            );
          }}
          ListFooterComponent={thinking ? <ThinkingIndicator /> : null}
        />

        {safetyState.breakReminder ? (
          <View style={[styles.banner, { backgroundColor: colors.accentTint }]}>
            <Text style={[styles.bannerText, { color: colors.accent }]}>{safetyState.breakReminder}</Text>
            <PressableScale
              haptic="light"
              onPress={() => setBreakReminder(null)}
              accessibilityLabel="Dismiss reminder"
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={colors.accent} />
            </PressableScale>
          </View>
        ) : null}

        {showLimit ? (
          <View style={[styles.limit, { backgroundColor: colors.accentTint }]}>
            <Text style={[styles.limitTitle, { color: colors.textPrimary }]}>{CHAT.limit.title}</Text>
            <Text style={[styles.limitText, { color: colors.textSecondary }]}>
              {withName(CHAT.limit.notice)}
            </Text>
            <Button label={CHAT.limit.cta} size="sm" variant="tinted" onPress={() => router.push('/premium')} />
          </View>
        ) : null}

        <Animated.View style={[styles.composerWrap, composerWrapStyle]}>
          <ChatComposer
            value={input}
            onChangeText={(t) => {
              setInput(t);
              if (!t) setVoiceDraft(null);
            }}
            onSend={send}
            onVoiceResult={(info) => setVoiceDraft(info)}
            placeholder={withName(CHAT.inputPlaceholder)}
          />
        </Animated.View>
      </KeyboardAvoidingView>

      <BottomSheet visible={overflowOpen} onClose={() => setOverflowOpen(false)} scrollable={false}>
        <View style={styles.overflow}>
          {[
            {
              label: CHAT.overflow.settings,
              go: () => router.push({ pathname: '/companion/create', params: { mode: 'edit', id: cid } }),
              danger: false,
            },
            {
              label: CHAT.overflow.viewMemory,
              go: () => router.push({ pathname: '/long-term-memory', params: { companion: cid } }),
              danger: false,
            },
            {
              label: CHAT.overflow.report,
              // iOS can't present a Modal while this sheet is dismissing — wait
              // out the exit animation before mounting the report sheet.
              go: () =>
                setTimeout(
                  () => openReport([...messages].reverse().find(isReportable)?.id ?? null),
                  DURATION.normal + 30,
                ),
              danger: true,
            },
          ].map((row) => (
            <PressableScale
              key={row.label}
              haptic="light"
              onPress={() => {
                setOverflowOpen(false);
                row.go();
              }}
              style={styles.overflowRow}
            >
              <Text style={[styles.overflowText, { color: row.danger ? colors.error : colors.textPrimary }]}>
                {row.label}
              </Text>
            </PressableScale>
          ))}
        </View>
      </BottomSheet>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} onSubmit={submitReport} />

      <Toast visible={toast} message={CHAT.report.confirmToast} onHide={() => setToast(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  // flexGrow: the content wrapper spans the full frame so the whole
  // header-to-composer area stays interactive even when under-filled.
  thread: { flexGrow: 1, paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: SPACE.md },
  crisisWrap: { marginVertical: SPACE.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    alignSelf: 'center',
    maxWidth: '86%',
    marginBottom: SPACE.sm,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.pill,
  },
  bannerText: { flex: 1, fontFamily: FONTS.body.regular, fontSize: 13, lineHeight: 18 },
  limit: {
    marginHorizontal: SPACE.lg,
    marginBottom: SPACE.sm,
    padding: SPACE.md,
    borderRadius: RADIUS.soft,
    gap: SPACE.sm,
  },
  limitTitle: { ...TYPE.title, fontSize: 18 },
  limitText: { fontFamily: FONTS.body.regular, fontSize: 13, lineHeight: 18 },
  composerWrap: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm },
  overflow: { paddingTop: SPACE.xs },
  overflowRow: { paddingVertical: SPACE.md, alignItems: 'center' },
  overflowText: { ...TYPE.body },
});
