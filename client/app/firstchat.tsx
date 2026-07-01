// First conversation — onboarding ENDS here, in the real chat (not a dashboard). The chosen
// companion greets the user warmly by name, with a dismissible disclosure banner above the
// thread and the input dock below. Builds + uses the reusable chat chrome (@/components/chat).
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from 'react-native-reanimated';
// See chat/[id].tsx for why: keyboard-controller's KeyboardAvoidingView syncs via Reanimated with
// the real native keyboard animation, unlike RN's own LayoutAnimation-driven one.
import { KeyboardAvoidingView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatHeader, MessageBubble, DisclosureBanner, ChatComposer } from '@/components/chat';
import { CHAT, ONBOARDING, PERSONAS } from '@/constants/content';
import { SPACE } from '@/constants/design';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

type Msg = { role: 'user' | 'assistant'; text: string };

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

  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', text: greeting }]);
  const [draft, setDraft] = useState('');
  // See chat/[id].tsx: composer's own safe-area padding eases out over the same continuous signal
  // that drives KeyboardAvoidingView's push, instead of staying constant and double-padding above
  // an already-open keyboard.
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

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setDraft('');
    finishOnboarding();
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
        <ScrollView style={styles.flex} contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
          <DisclosureBanner text={banner} />
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} text={m.text} />
          ))}
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
