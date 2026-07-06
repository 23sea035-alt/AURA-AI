// Chat — the focal screen. The thread reads as chapters (serif date moments),
// the reply is the signature payoff (thinking beat → word-by-word reveal), and
// the safety chrome stays quiet: first-session banner, recurring AI notice on
// flagged turns, grounding crisis card, gentle break reminder, and a calm
// free-limit card. Runs entirely on the mock pipeline (context.sendTurn) —
// wiring the live API later only touches AppContext.
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { CHAT, SYSTEM } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { DURATION } from '@/constants/motion';
import { type Message, useApp } from '@/context/AppContext';
import { useDraft } from '@/hooks/useDraft';
import { useTheme } from '@/hooks/useTheme';
import { reportMessage } from '@/lib/backend';
import { buildThreadRows, type ThreadRow } from '@/lib/thread';

// Recurring SB 243 line (client-owned copy; the server decides when it fires).
const AI_NOTICE = 'Just a quiet reminder: {Companion} is an AI.';

// History pagination — only the newest page loads with the screen; scrolling up
// past the loaded window fetches the next page so history feels seamless.
// WIRE SEAM: GET /api/companions/:id/messages?before=<cursor>&limit=PAGE_SIZE.
const PAGE_SIZE = 30;

type Row = ThreadRow<Message>;

export default function ChatScreen() {
  const { colors, mode, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { id, starter } = useLocalSearchParams<{ id: string; starter?: string }>();
  const { user, companions, getMessagesForCompanion, sendTurn, removeMessage, safetyState, setBreakReminder } =
    useApp();

  const companion = companions.find((c) => c.id === id) ?? companions[0];
  const cid = companion?.id ?? '';
  const name = companion?.name ?? 'Aurora';
  const withName = (s: string) => s.replace('{Companion}', name);

  const listRef = useRef<FlatList<Row>>(null);
  const sessionTurns = useRef(0);

  // Home's starter chips arrive pre-filled, ready to send — never auto-sent;
  // otherwise an unsent draft (persisted per companion) is restored.
  const [input, setInput] = useDraft(cid, typeof starter === 'string' ? starter : '');
  const [thinking, setThinking] = useState(false);
  const [revealId, setRevealId] = useState<string | null>(null);
  const [limit, setLimit] = useState<{ used: number; limit: number } | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [voiceDraft, setVoiceDraft] = useState<{ audioUri?: string } | null>(null);
  // Tap a bubble to reveal its time; long-press opens the message action sheet.
  const [timeFor, setTimeFor] = useState<string | null>(null);
  const [msgSheetFor, setMsgSheetFor] = useState<Message | null>(null);
  // Jump-to-latest pill: shown when scrolled into history; "New reply" when one
  // lands while away from the bottom.
  const [showJump, setShowJump] = useState(false);
  const [newReply, setNewReply] = useState(false);
  const showJumpRef = useRef(false);
  showJumpRef.current = showJump;

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

  // Pagination window: only the newest PAGE_SIZE messages render on open;
  // reaching the top of the loaded window pulls in the previous page.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const hasOlder = messages.length > visibleCount;
  const windowed = useMemo(() => messages.slice(-visibleCount), [messages, visibleCount]);

  const loadOlder = () => {
    if (!hasOlder || loadingOlder) return;
    setLoadingOlder(true);
    // WIRE SEAM: fetch the page before the oldest loaded message's cursor; the
    // mock's history is already local, so this just widens the window.
    setTimeout(() => {
      setVisibleCount((c) => c + PAGE_SIZE);
      setLoadingOlder(false);
    }, DURATION.normal);
  };

  // Thread rows (dividers, grouping/tails, attachments as their own rows),
  // reversed for the inverted list — pure logic in @/lib/thread, unit-tested.
  const rows: Row[] = useMemo(
    () => buildThreadRows(windowed, { revealId, timeFor }),
    [windowed, revealId, timeFor],
  );

  // Inverted list: offset 0 IS the bottom (the newest message).
  const scrollToBottom = (animated = true) => listRef.current?.scrollToOffset({ offset: 0, animated });

  const isReportable = (m: Message) => m.role === 'assistant' && m.id !== 'greeting';
  const openReport = (messageId: string | null) => {
    setReportTargetId(messageId);
    setReportOpen(true);
  };
  const submitReport = (reason: string, note: string) => {
    setReportOpen(false);
    // Fire-and-forget + non-punitive: never surface a report error to the user.
    if (reportTargetId) void reportMessage(reportTargetId, reason, note || undefined);
    setToast(CHAT.report.confirmToast);
  };

  const copyMessage = async (m: Message) => {
    setMsgSheetFor(null);
    await Clipboard.setStringAsync(m.content);
    setToast('Copied');
  };

  const sendContent = async (content: string, opts?: { inputModality?: 'text' | 'voice'; audioUri?: string }) => {
    setThinking(true);
    sessionTurns.current += 1;
    scrollToBottom();

    const result = await sendTurn(cid, content, sessionTurns.current, opts);
    setThinking(false);

    if (result.limitReached) {
      setLimit(result.limitReached);
      setInput(content); // give the capped message back to the composer
      return;
    }
    if (result.failed || result.blocked) return; // the thread renders the state inline
    if (result.assistant) {
      // The reveal is the payoff — a soft tick marks the reply landing.
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRevealId(result.assistant.id);
      if (showJumpRef.current) setNewReply(true);
    }
  };

  const send = async () => {
    const content = input.trim();
    if (!content || thinking) return;
    const draft = voiceDraft;
    setInput('');
    setVoiceDraft(null);
    await sendContent(content, { inputModality: draft ? 'voice' : 'text', audioUri: draft?.audioUri });
  };

  // Failed-send retry: take the failed bubble back and re-send its content.
  const retry = (m: Message) => {
    if (thinking) return;
    removeMessage(cid, m.id);
    void sendContent(m.content, { inputModality: m.inputModality, audioUri: m.audioUri });
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
          lookId={companion?.lookId}
          onBack={() => router.back()}
          onVoiceCall={() => router.push({ pathname: '/voice-call', params: { id: cid } })}
          onOverflow={() => setOverflowOpen(true)}
        />
      </View>

      {/* First-session banner pinned under the header (not scrolled away with history). */}
      {safetyState.showDisclosure ? (
        <View style={styles.bannerWrap}>
          <DisclosureBanner text={withName(CHAT.disclosureBanner)} />
        </View>
      ) : null}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          style={styles.flex}
          // Inverted: the screen OPENS anchored to the newest message, and older
          // pages load in at the visual top without any scroll jump.
          inverted
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.4}
          scrollEventThrottle={48}
          onScroll={(e) => {
            // Inverted: offset 0 is the bottom; past a screen's worth = "away".
            const away = e.nativeEvent.contentOffset.y > 320;
            setShowJump(away);
            if (!away) setNewReply(false);
          }}
          // Inverted list: header = visual bottom, footer = visual top.
          ListHeaderComponent={thinking ? <ThinkingIndicator /> : null}
          ListFooterComponent={
            loadingOlder ? (
              <View style={styles.olderLoading}>
                <ThinkingIndicator />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.kind === 'divider') return <ThreadDivider label={item.label} />;
            if (item.kind === 'notice') return <AiNotice text={withName(AI_NOTICE)} />;
            if (item.kind === 'time') {
              const t = new Date(item.msg.createdAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });
              return (
                <Text
                  style={[
                    styles.timeStamp,
                    { color: colors.textSecondary },
                    item.msg.role === 'user' ? styles.timeRight : styles.timeLeft,
                  ]}
                >
                  {t}
                </Text>
              );
            }
            if (item.kind === 'crisis') {
              return (
                <View style={styles.crisisWrap}>
                  <CrisisSupport companion={name} />
                </View>
              );
            }
            if (item.kind === 'sendState') {
              const failed = item.msg.status === 'failed';
              return failed ? (
                <PressableScale
                  haptic="light"
                  onPress={() => retry(item.msg)}
                  accessibilityLabel={CHAT.sendFailed}
                  style={styles.sendState}
                >
                  <Text style={[styles.sendStateText, { color: colors.error }]}>{CHAT.sendFailed}</Text>
                </PressableScale>
              ) : (
                <View style={styles.sendState}>
                  <Text style={[styles.sendStateText, { color: colors.textSecondary }]}>{SYSTEM.blocked}</Text>
                </View>
              );
            }
            const m = item.msg;
            const revealing = m.id === revealId;
            const held = m.status === 'failed' || m.status === 'blocked';
            return (
              <View style={held ? styles.heldBubble : null}>
                <MessageBubble
                  role={m.role === 'user' ? 'user' : 'assistant'}
                  text={m.content}
                  audioUri={m.audioUri}
                  onPress={() => setTimeFor((cur) => (cur === m.id ? null : m.id))}
                  onLongPress={m.id !== 'greeting' ? () => setMsgSheetFor(m) : undefined}
                  reveal={revealing}
                  onRevealProgress={() => scrollToBottom(false)}
                  onRevealDone={() => setRevealId(null)}
                  grouped={item.grouped}
                  tail={item.tail}
                />
              </View>
            );
          }}
        />

        {showJump ? (
          <PressableScale
            haptic="light"
            onPress={() => {
              scrollToBottom(true);
              setNewReply(false);
            }}
            accessibilityLabel={newReply ? 'New reply, jump to latest' : 'Jump to latest'}
            style={[styles.jumpPill, { backgroundColor: colors.sheet }, shadows.e2]}
          >
            {newReply ? (
              <Text style={[styles.jumpText, { color: colors.accent }]}>New reply</Text>
            ) : null}
            <Ionicons name="arrow-down" size={16} color={newReply ? colors.accent : colors.textSecondary} />
          </PressableScale>
        ) : null}

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

      {/* Message actions — copy (both roles), report (assistant turns). */}
      <BottomSheet visible={!!msgSheetFor} onClose={() => setMsgSheetFor(null)} scrollable={false}>
        <View style={styles.overflow}>
          <PressableScale
            haptic="light"
            onPress={() => msgSheetFor && void copyMessage(msgSheetFor)}
            style={styles.overflowRow}
          >
            <Text style={[styles.overflowText, { color: colors.textPrimary }]}>Copy message</Text>
          </PressableScale>
          {msgSheetFor && isReportable(msgSheetFor) ? (
            <PressableScale
              haptic="light"
              onPress={() => {
                const id = msgSheetFor.id;
                setMsgSheetFor(null);
                // iOS can't present a Modal while this sheet is dismissing.
                setTimeout(() => openReport(id), DURATION.normal + 30);
              }}
              style={styles.overflowRow}
            >
              <Text style={[styles.overflowText, { color: colors.error }]}>{CHAT.overflow.report}</Text>
            </PressableScale>
          ) : null}
        </View>
      </BottomSheet>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} onSubmit={submitReport} />

      <Toast visible={toast !== null} message={toast ?? ''} onHide={() => setToast(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  // flexGrow: the content wrapper spans the full frame so the whole
  // header-to-composer area stays interactive even when under-filled.
  thread: { flexGrow: 1, paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: SPACE.md },
  bannerWrap: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.md },
  olderLoading: { alignItems: 'center', paddingVertical: SPACE.sm },
  // Failed/blocked sends stay visible but recede.
  heldBubble: { opacity: 0.55 },
  timeStamp: { ...TYPE.caption, marginTop: SPACE.xs },
  timeRight: { alignSelf: 'flex-end' },
  timeLeft: { alignSelf: 'flex-start' },
  jumpPill: {
    position: 'absolute',
    right: SPACE.lg,
    bottom: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.md,
    minHeight: 36,
    borderRadius: RADIUS.pill,
  },
  jumpText: { ...TYPE.label },
  sendState: { alignSelf: 'flex-end', paddingVertical: SPACE.xs },
  sendStateText: { ...TYPE.caption },
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
