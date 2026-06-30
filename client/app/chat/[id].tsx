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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheet from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ChatHeader, MessageBubble, ChatComposer, DisclosureBanner } from '@/components/chat';
import { PressableScale } from '@/components/motion';
import { CHAT } from '@/constants/content';
import { FONTS, RADIUS, SPACE, TYPE } from '@/constants/design';
import { type Message, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
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
  // Set when the next send originated from hold-to-talk dictation; consumed (and cleared) on send.
  const [voiceDraft, setVoiceDraft] = useState<{ audioUri?: string } | null>(null);

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
          const aiMsg: Message = { id: String(msg.messageId), role: 'assistant', content: final, createdAt: new Date().toISOString() };
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <FlatList
          ref={listRef}
          data={data}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          ListHeaderComponent={safetyState.showDisclosure ? <DisclosureBanner text={CHAT.disclosureBanner.replace('{Companion}', companion?.name ?? 'Aurora')} /> : null}
          renderItem={({ item }) => (
            <MessageBubble role={item.role === 'user' ? 'user' : 'assistant'} text={item.content} audioUri={item.audioUri} />
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

        <View style={[styles.composerWrap, { paddingBottom: insets.bottom + SPACE.sm }]}>
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
        </View>
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
            { label: CHAT.overflow.report, go: () => {}, danger: true },
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
  thread: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: SPACE.md },
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
