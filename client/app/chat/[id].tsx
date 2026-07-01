// Chat — the pushed conversation screen. Reuses the chat chrome built in onboarding's first
// conversation. Preserves the existing send pipeline (WebSocket streaming -> REST -> local
// fallback) and break-reminder / limit handling; only the UI is restyled to Warm Sanctuary.
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
// The built-in RN KeyboardAvoidingView drives its padding via LayoutAnimation, which doesn't
// actually ease under the New Architecture here — it snaps instantly while the real system
// keyboard keeps animating underneath, producing a visible desync ("teleport then catch up") on
// both open and dismiss. keyboard-controller's version instead syncs via Reanimated, frame-by-frame
// with the real native keyboard animation.
import { KeyboardAvoidingView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheet from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ChatHeader, MessageBubble, ChatComposer, DisclosureBanner, ReportSheet } from '@/components/chat';
import { CrisisSupport } from '@/components/CrisisSupport';
import { PressableScale } from '@/components/motion';
import { Toast } from '@/components/Toast';
import { CHAT } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { type Message, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { apiReportMessage } from '@/lib/api';
import { connectChatWs } from '@/lib/websocket';

const FALLBACK_REPLY = "I'm here with you. Tell me a little more?";

export default function ChatScreen() {
  const { colors, mode, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    companions,
    getMessagesForCompanion,
    addMessage,
    sendMessageToAPI,
    loadMessagesFromAPI,
    apiError,
    clearApiError,
    safetyState,
    setBreakReminder,
  } = useApp();

  const companion = companions.find((c) => c.id === id) ?? companions[0];
  const cid = id ?? companion?.id ?? '';
  const listRef = useRef<FlatList<Message>>(null);
  const wsRef = useRef<ReturnType<typeof connectChatWs> | null>(null);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  // Set when the next send originated from hold-to-talk dictation; consumed (and cleared) on send.
  const [voiceDraft, setVoiceDraft] = useState<{ audioUri?: string } | null>(null);
  // Composer's own bottom safe-area padding must ease out over the same continuous signal that
  // drives KeyboardAvoidingView's push, rather than a discrete keyboardDidShow/Hide flip — a
  // boolean toggle lands at a slightly different moment than the real keyboard settles, producing
  // a visible snap independent of the (already-smooth) main translation.
  const { progress: keyboardProgress } = useReanimatedKeyboardAnimation();

  // A message is reportable once it's a real assistant turn (not the local greeting or the
  // in-progress streaming placeholder).
  const isReportable = (m: Message) => m.role === 'assistant' && m.id !== 'initial' && m.id !== 'streaming';
  const openReport = (messageId: string | null) => {
    setReportTargetId(messageId);
    setReportOpen(true);
  };
  const submitReport = (reason: string, note: string) => {
    setReportOpen(false);
    // Fire-and-forget + non-punitive: never surface a report error to the user.
    if (reportTargetId) apiReportMessage(reportTargetId, reason, note || undefined);
    setToast(true);
  };

  const greeting: Message = {
    id: 'initial',
    role: 'assistant',
    content: `Hi, I'm ${companion?.name ?? 'Aurora'}. What's on your mind today?`,
    createdAt: new Date(0).toISOString(),
  };
  const [messages, setMessages] = useState<Message[]>([greeting, ...getMessagesForCompanion(cid)]);

  useEffect(() => {
    if (!cid) return;
    loadMessagesFromAPI(cid).then(() => {
      const apiMsgs = getMessagesForCompanion(cid);
      if (apiMsgs.length > 0) setMessages([greeting, ...apiMsgs]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  useEffect(() => () => wsRef.current?.close(), []);

  // Auto-dismiss the break reminder after 10s.
  useEffect(() => {
    if (!safetyState.breakReminder) return;
    const t = setTimeout(() => setBreakReminder(null), 10000);
    return () => clearTimeout(t);
  }, [safetyState.breakReminder, setBreakReminder]);

  const scrollToEnd = () => listRef.current?.scrollToEnd({ animated: true });

  const sendMessage = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput('');
    clearApiError();

    const inputModality: 'text' | 'voice' = voiceDraft ? 'voice' : 'text';
    const audioUri = voiceDraft?.audioUri;
    setVoiceDraft(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      inputModality,
      audioUri,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    const sessionStart = messages.length ? messages[messages.length - 1].createdAt : new Date().toISOString();

    let usedWs = false;
    const ws = connectChatWs(cid, {
      onToken: (token) => {
        usedWs = true;
        setIsTyping(false);
        setStreaming((prev) => (prev ?? '') + token);
      },
      onDone: (msg) => {
        if (!usedWs) return;
        setStreaming((prev) => {
          const final = prev ?? '';
          const aiMsg: Message = { id: String(msg.messageId), role: 'assistant', content: final, createdAt: new Date().toISOString(), safetyFlagged: msg.safetyFlagged };
          setMessages((m) => [...m, aiMsg]);
          addMessage(cid, { role: 'assistant', content: final, createdAt: new Date().toISOString() });
          if (msg.breakReminder) setBreakReminder(msg.breakReminder);
          return null;
        });
        setIsTyping(false);
      },
      onError: () => {},
    });
    wsRef.current = ws;
    ws.send({ content, sessionStartedAt: sessionStart });

    // Fall back to REST (then a local reply) if the socket doesn't stream within 2s.
    setTimeout(async () => {
      if (usedWs) return;
      ws.close();
      wsRef.current = null;

      const aiMsg = await sendMessageToAPI(cid, content, sessionStart);
      if (aiMsg) {
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
        return;
      }
      addMessage(cid, { role: 'user', content, createdAt: new Date().toISOString(), inputModality, audioUri });
      setTimeout(() => {
        const reply: Message = { id: `${Date.now() + 1}`, role: 'assistant', content: FALLBACK_REPLY, createdAt: new Date().toISOString() };
        setMessages((prev) => [...prev, reply]);
        addMessage(cid, { role: 'assistant', content: FALLBACK_REPLY, createdAt: new Date().toISOString() });
        setIsTyping(false);
      }, 1200);
    }, 2000);
  };

  const composerWrapStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(
      keyboardProgress.value,
      [0, 1],
      [insets.bottom + SPACE.sm, SPACE.md],
      Extrapolation.CLAMP,
    ),
  }));

  const limitReached = apiError?.startsWith('limitReached:');
  const data = streaming
    ? [...messages, { id: 'streaming', role: 'assistant' as const, content: streaming, createdAt: new Date().toISOString() }]
    : messages;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={{ paddingTop: insets.top + SPACE.sm }}>
        <ChatHeader
          id={companion?.id ?? ''}
          name={companion?.name ?? 'Aurora'}
          onBack={() => router.back()}
          onOverflow={() => setOverflowOpen(true)}
        />
      </View>

      {/* No keyboardVerticalOffset: this KAV is a plain flow sibling (not in a Modal), so it
          already measures its own on-screen position via onLayout — a manual offset here would
          double-count the header height on top of that measurement. */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          style={styles.flex}
          data={data}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          ListHeaderComponent={safetyState.showDisclosure ? <DisclosureBanner text={CHAT.disclosureBanner.replace('{Companion}', companion?.name ?? 'Aurora')} /> : null}
          renderItem={({ item }) => (
            <>
              <MessageBubble
                role={item.role === 'user' ? 'user' : 'assistant'}
                text={item.content}
                audioUri={item.audioUri}
                onLongPress={isReportable(item) ? () => openReport(item.id) : undefined}
              />
              {item.role === 'assistant' && item.safetyFlagged ? (
                <View style={styles.crisisWrap}>
                  <CrisisSupport companion={companion?.name ?? 'Aurora'} />
                </View>
              ) : null}
            </>
          )}
          ListFooterComponent={isTyping ? <TypingDots /> : null}
        />

        {safetyState.breakReminder ? (
          <View style={[styles.banner, { backgroundColor: colors.crisisBg }]}>
            <Text style={[styles.bannerText, { color: colors.crisisText }]}>{safetyState.breakReminder}</Text>
          </View>
        ) : null}

        {limitReached ? (
          <View style={[styles.limit, { backgroundColor: colors.accentTint }]}>
            <Text style={[styles.limitText, { color: colors.textSecondary }]}>
              {CHAT.limit.notice.replace('{Companion}', companion?.name ?? 'Aurora')}
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
            onSend={() => sendMessage()}
            onVoiceResult={(info) => setVoiceDraft(info)}
            placeholder={CHAT.inputPlaceholder.replace('{Companion}', companion?.name ?? 'Aurora')}
          />
        </Animated.View>
      </KeyboardAvoidingView>

      <BottomSheet visible={overflowOpen} onClose={() => setOverflowOpen(false)}>
        <View style={styles.overflow}>
          {[
            {
              label: CHAT.overflow.settings,
              go: () => router.push({ pathname: '/companion/create', params: { mode: 'edit' } }),
              danger: false,
            },
            { label: CHAT.overflow.viewMemory, go: () => router.push('/long-term-memory'), danger: false },
            {
              label: CHAT.overflow.report,
              go: () => openReport([...messages].reverse().find(isReportable)?.id ?? null),
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

function TypingDots() {
  const { colors, shadows } = useTheme();
  return (
    <View style={[styles.typing, { backgroundColor: colors.sheet }, shadows.e1]}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  // flexGrow: the content wrapper spans the full frame (not just its own content) so the whole
  // header-to-composer area stays interactive even when under-filled. Messages stay top-aligned
  // (default); "anchored to the bottom" once overflowing is scrollToEnd() showing the latest
  // message at the bottom of the frame — not a permanent bottom-justify.
  thread: { flexGrow: 1, paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: SPACE.md },
  crisisWrap: { marginVertical: SPACE.sm },
  typing: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    marginVertical: SPACE.xs,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  banner: { marginHorizontal: SPACE.lg, marginBottom: SPACE.sm, padding: SPACE.md, borderRadius: RADIUS.soft },
  bannerText: { fontFamily: FONTS.body.regular, fontSize: 13, lineHeight: 18 },
  limit: {
    marginHorizontal: SPACE.lg,
    marginBottom: SPACE.sm,
    padding: SPACE.md,
    borderRadius: RADIUS.soft,
    gap: SPACE.sm,
  },
  limitText: { fontFamily: FONTS.body.regular, fontSize: 13, lineHeight: 18 },
  composerWrap: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm },
  overflow: { paddingTop: SPACE.xs },
  overflowRow: { paddingVertical: SPACE.md, alignItems: 'center' },
  overflowText: { ...TYPE.body },
});
