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
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Platform, ScrollView } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
// The built-in RN KeyboardAvoidingView drives its padding via LayoutAnimation, which doesn't
// ease under the New Architecture — keyboard-controller syncs via Reanimated, frame-by-frame
// with the real native keyboard animation.
import { KeyboardAvoidingView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PERSONA_PRESETS } from '@aura/shared';

import { Avatar } from '@/components/Avatar';
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
import { CompanionLimitSheet, type CompanionLimitKind } from '@/components/companion/CompanionLimitSheet';
import ConfirmSheet from '@/components/ConfirmSheet';
import { CrisisSupport } from '@/components/CrisisSupport';
import { PressableScale } from '@/components/motion';
import { Toast } from '@/components/Toast';
import { CHAT, COMPANIONS, SYSTEM } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { DURATION } from '@/constants/motion';
import { type Message, useApp } from '@/context/AppContext';
import { useDraft } from '@/hooks/useDraft';
import { useTheme } from '@/hooks/useTheme';
import { reportMessage } from '@/lib/backend';
import { activeOf } from '@/lib/roster';
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
  const {
    user,
    companions,
    getMessagesForCompanion,
    sendTurn,
    removeMessage,
    safetyState,
    setBreakReminder,
    restoreCompanion,
    clearConversation,
    forgetEverything,
  } = useApp();

  const companion = companions.find((c) => c.id === id) ?? companions[0];
  const cid = companion?.id ?? '';
  const name = companion?.name ?? 'Aurora';
  const archived = !!companion?.archivedAt;
  const withName = (s: string) => s.replace('{Companion}', name);
  // Empty-state persona line + starter-chip seeds ride on the shared voice pack, keyed by the
  // companion's fixed base persona (spec §10/§11) — never re-declared client-side.
  const preset = PERSONA_PRESETS.find((p) => p.id === companion?.personaKey);

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
  // Clear conversation / Forget everything (spec §7) — one confirm sheet, two destructive verbs.
  const [confirmKind, setConfirmKind] = useState<'clear' | 'forget' | null>(null);
  // Archived-chat unarchive can hit the active cap (spec §6/§8) — same at-limit sheet as create.
  const [limitKind, setLimitKind] = useState<CompanionLimitKind | null>(null);
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

  // Every companion after onboarding #1 starts empty and user-initiated (spec §10) — an empty
  // thread renders the persona empty state + starter chips below, never a fake local message.
  const messages: Message[] = getMessagesForCompanion(cid);
  const hasUserMessage = messages.some((m) => m.role === 'user');

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

  const isReportable = (m: Message) => m.role === 'assistant';
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

  const sendContent = async (content: string, opts?: { inputModality?: 'text' | 'voice'; audioUri?: string; turnId?: string }) => {
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
    if (result.failed || result.blocked) {
      // The thread renders the state inline as the newest rows — snap to the
      // bottom so "tap to retry" is never left sitting under the composer.
      scrollToBottom();
      return;
    }
    if (result.assistant) {
      // The reveal is the payoff — a soft tick marks the reply landing.
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setRevealId(result.assistant.id);
      if (showJumpRef.current) setNewReply(true);
    }
  };

  const send = async () => {
    const content = input.trim();
    // Reading an archived chat is always free; the composer is replaced with an unarchive bar
    // (spec §8), but guard the send path too rather than trust the UI alone.
    if (!content || thinking || archived) return;
    const draft = voiceDraft;
    setInput('');
    setVoiceDraft(null);
    await sendContent(content, { inputModality: draft ? 'voice' : 'text', audioUri: draft?.audioUri });
  };

  // Failed-send retry: take the failed bubble back and re-send its content under the SAME
  // turnId — if the original send actually committed server-side, the retry dedupes.
  const retry = (m: Message) => {
    if (thinking) return;
    removeMessage(cid, m.id);
    void sendContent(m.content, { inputModality: m.inputModality, audioUri: m.audioUri, turnId: m.turnId });
  };

  // Archived-chat composer replacement (spec §8): only re-activating consumes a slot, so it's
  // the one gated action — a full roster opens the same at-limit sheet the create flow uses.
  const unarchive = () => {
    const result = restoreCompanion(cid);
    if (!result.ok && result.block === 'active_full') setLimitKind('active_full');
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
          // Keyed by the base persona, not the row id: created companions have generated row ids,
          // and the portrait/duotone (and the look filter) resolve off the persona key.
          id={companion?.personaKey ?? cid}
          name={name}
          lookId={companion?.lookId}
          onBack={() => router.back()}
          // Archived: reading is free, but voice calling would start a live turn — hide the entry
          // point entirely rather than let it lead to a blocked call (spec §8).
          onVoiceCall={archived ? undefined : () => router.push({ pathname: '/voice-call', params: { id: cid } })}
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
          // Persona-flavored empty state (spec §10): presentation, never a chat message. Cells
          // counter-flip themselves back upright under `inverted`, but Empty/Header/Footer don't —
          // one manual scaleY undoes the list's own flip so this reads upright and centered.
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Avatar id={companion?.personaKey ?? cid} name={name} size={72} lookId={companion?.lookId} />
              <Text style={[styles.emptyName, { color: colors.textPrimary }]}>{name}</Text>
              {companion?.persona ? (
                <Text style={[styles.emptyLine, { color: colors.textSecondary }]}>{companion.persona}</Text>
              ) : null}
            </View>
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
                  onLongPress={() => setMsgSheetFor(m)}
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
          {/* Starter chips (spec §10): empty-state only, gone once the user has sent anything
              (an onboarding opener with zero user replies still counts as empty — chips act as
              reply chips there) and hidden mid-reply or once the chat is archived. */}
          {!archived && !hasUserMessage && !thinking && (preset?.starters.length ?? 0) > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              keyboardShouldPersistTaps="handled"
            >
              {preset!.starters.map((s) => (
                <PressableScale
                  key={s}
                  haptic="light"
                  onPress={() => setInput(s)}
                  // Tonal fill + soft shadow, matching Home's starter chips — a hairline-only
                  // pill fails SC 1.4.11 and reads as stray text (see (tabs)/index.tsx).
                  style={[styles.chip, { backgroundColor: colors.raised }, shadows.e1]}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {s}
                  </Text>
                </PressableScale>
              ))}
            </ScrollView>
          ) : null}

          {archived ? (
            <View style={[styles.archivedBar, { backgroundColor: colors.raised, borderColor: colors.border }]}>
              <Text style={[styles.archivedText, { color: colors.textSecondary }]}>
                {COMPANIONS.archivedBar.notice}
              </Text>
              <Button label={COMPANIONS.archivedBar.cta} size="sm" variant="tinted" onPress={unarchive} />
            </View>
          ) : (
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
          )}
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
              label: CHAT.overflow.clear,
              // iOS can't present a Modal while this sheet is dismissing.
              go: () => setTimeout(() => setConfirmKind('clear'), DURATION.normal + 30),
              danger: false,
            },
            {
              label: CHAT.overflow.forget,
              go: () => setTimeout(() => setConfirmKind('forget'), DURATION.normal + 30),
              danger: true,
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

      {/* Clear conversation / Forget everything (spec §7) — disjoint verbs sharing one confirm
          sheet: Clear keeps memories, Forget wipes them too. Both destructive, both irreversible. */}
      <ConfirmSheet
        visible={confirmKind !== null}
        onClose={() => setConfirmKind(null)}
        title={confirmKind === 'forget' ? CHAT.forgetConfirm.title : CHAT.clearConfirm.title}
        message={withName(confirmKind === 'forget' ? CHAT.forgetConfirm.body : CHAT.clearConfirm.body)}
        confirmLabel={confirmKind === 'forget' ? CHAT.forgetConfirm.confirm : CHAT.clearConfirm.confirm}
        cancelLabel={CHAT.clearConfirm.cancel}
        destructive
        onConfirm={() => {
          if (confirmKind === 'forget') {
            forgetEverything(cid);
            setToast(withName(CHAT.forgotToast));
          } else if (confirmKind === 'clear') {
            clearConversation(cid);
            setToast(CHAT.clearedToast);
          }
          setConfirmKind(null);
        }}
      />

      <CompanionLimitSheet
        kind={limitKind}
        onClose={() => setLimitKind(null)}
        isPremium={!!user?.isPremium}
        activeCount={activeOf(companions).length}
        onArchive={() => router.push({ pathname: '/(tabs)/companions', params: { select: 'active' } })}
        onManageArchived={() => router.push({ pathname: '/(tabs)/companions', params: { select: 'archived' } })}
        onGoPremium={() => router.push('/premium')}
      />

      <Toast visible={toast !== null} message={toast ?? ''} onHide={() => setToast(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  // flexGrow: the content wrapper spans the full frame so the whole
  // header-to-composer area stays interactive even when under-filled.
  // Inverted list: paddingTop renders at the VISUAL BOTTOM — the larger value
  // keeps send-state rows ("tap to retry") clear of the composer's top edge.
  thread: { flexGrow: 1, paddingHorizontal: SPACE.lg, paddingTop: SPACE.xl, paddingBottom: SPACE.md },
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
  // Persona empty state (spec §10): centered in the thread's available space. `inverted` flips
  // the whole list's rendering; a lone counter scaleY undoes it for this one subtree so the
  // avatar + text read upright (ordinary message cells do this automatically; Empty doesn't).
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.xl,
    transform: [{ scaleY: -1 }],
  },
  emptyName: { ...TYPE.title, marginTop: SPACE.xs },
  emptyLine: { ...TYPE.body, textAlign: 'center', maxWidth: 300 },
  composerWrap: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm, gap: SPACE.sm },
  // Starter chips (spec §10) — a horizontal-scrolling row so 2-3 persona-flavored sentences never
  // fight the composer for vertical space.
  chipsRow: { gap: SPACE.sm, paddingRight: SPACE.lg },
  chip: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    maxWidth: 260,
  },
  chipText: { ...TYPE.label, fontFamily: FONTS.body.medium },
  // Archived-chat composer replacement (spec §8) — reading stays free; only re-activating is gated.
  archivedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.soft,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
  },
  archivedText: { ...TYPE.body, flexShrink: 1 },
  overflow: { paddingTop: SPACE.xs },
  overflowRow: { paddingVertical: SPACE.md, alignItems: 'center' },
  overflowText: { ...TYPE.body },
});
