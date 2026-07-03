// First conversation — onboarding ENDS here, in the real chat (not a dashboard).
// The payoff is choreographed: a held beat, then the chosen companion's greeting
// writes itself in (the typing reveal's first appearance), and the first real
// reply lands the same way. Messages stay local — the persisted relationship
// starts on the Home/Chat surfaces; this screen is the doorway.
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
// See chat/[id].tsx for why: keyboard-controller's KeyboardAvoidingView syncs via Reanimated with
// the real native keyboard animation, unlike RN's own LayoutAnimation-driven one.
import { KeyboardAvoidingView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatHeader, MessageBubble, DisclosureBanner, ChatComposer, ThinkingIndicator } from '@/components/chat';
import { CHAT, ONBOARDING, PERSONAS } from '@/constants/content';
import { SPACE } from '@/constants/design';
import { TYPING } from '@/constants/motion';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { sendTurn } from '@/lib/mock';

type Msg = { id: string; role: 'user' | 'assistant'; text: string };

export default function FirstChatScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useApp();
  const params = useLocalSearchParams<{ companion?: string }>();
  const companion = (
    typeof params.companion === 'string' && params.companion in PERSONAS ? params.companion : 'Aurora'
  ) as keyof typeof PERSONAS;
  const firstName = user?.name?.trim().split(' ')[0] || 'there';

  const greeting = ONBOARDING.firstChat.greetingTemplate.replace('{firstName}', firstName);
  const banner = CHAT.disclosureBanner.replace('{Companion}', companion);
  const placeholder = CHAT.inputPlaceholder.replace('{Companion}', companion);

  // The greeting arrives after a held "considering" beat — the companion
  // noticed you walked in.
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(true);
  const [revealId, setRevealId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const turnCount = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setThinking(false);
      setMessages([{ id: 'greeting', role: 'assistant', text: greeting }]);
      setRevealId('greeting');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, TYPING.thinkMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { progress: keyboardProgress } = useReanimatedKeyboardAnimation();
  const composerWrapStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(
      keyboardProgress.value,
      [0, 1],
      [insets.bottom + SPACE.sm, SPACE.md],
      Extrapolation.CLAMP,
    ),
  }));

  const finishOnboarding = () => {
    if (!user?.onboardingDone) updateUser({ onboardingDone: true });
  };

  const scrollToEnd = (animated = true) => scrollRef.current?.scrollToEnd({ animated });

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft('');
    setMessages((m) => [...m, { id: `u-${m.length}`, role: 'user', text }]);
    finishOnboarding();

    setThinking(true);
    // Local-only first exchange through the same mock reply engine as Chat.
    const result = await sendTurn({
      companionId: companion.toLowerCase(),
      companionName: companion,
      personaKey: companion.toLowerCase(),
      content: text,
      assistantTurnCount: turnCount.current,
      sessionTurnCount: turnCount.current + 1,
      usage: { used: 0, limit: 30 },
      isPremium: false,
    });
    turnCount.current += 1;
    setThinking(false);
    if (result.reply) {
      const id = `a-${turnCount.current}`;
      setMessages((m) => [...m, { id, role: 'assistant', text: result.reply! }]);
      setRevealId(id);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDone = () => {
    finishOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <View style={{ paddingTop: insets.top + SPACE.sm }}>
        <ChatHeader id={companion.toLowerCase()} name={companion} onBack={handleDone} />
      </View>
      {/* No keyboardVerticalOffset — see chat/[id].tsx for why (plain flow sibling, self-measures). */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToEnd()}
        >
          <DisclosureBanner text={banner} />
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              text={m.text}
              reveal={m.id === revealId}
              onRevealProgress={() => scrollToEnd(false)}
              onRevealDone={() => setRevealId(null)}
            />
          ))}
          {thinking ? <ThinkingIndicator /> : null}
        </ScrollView>
        <Animated.View style={[styles.composerWrap, composerWrapStyle]}>
          <ChatComposer value={draft} onChangeText={setDraft} onSend={handleSend} placeholder={placeholder} />
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  // Same fix as chat/[id].tsx: the content wrapper spans the full frame (stays interactive when
  // under-filled) while messages stay top-aligned (default).
  thread: { flexGrow: 1, paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: SPACE.md },
  composerWrap: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm },
});
