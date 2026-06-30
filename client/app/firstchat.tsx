// First conversation — onboarding ENDS here, in the real chat (not a dashboard). The chosen
// companion greets the user warmly by name, with a dismissible disclosure banner above the
// thread and the input dock below. Builds + uses the reusable chat chrome (@/components/chat).
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
          <DisclosureBanner text={banner} />
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} text={m.text} />
          ))}
        </ScrollView>
        <View style={[styles.composerWrap, { paddingBottom: insets.bottom + SPACE.sm }]}>
          <ChatComposer value={draft} onChangeText={setDraft} onSend={handleSend} placeholder={placeholder} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  thread: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: SPACE.md },
  composerWrap: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm },
});
