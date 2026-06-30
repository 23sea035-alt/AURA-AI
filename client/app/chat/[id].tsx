import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CompanionAvatar } from '@/components/CompanionAvatar';
import { Message, useApp } from '@/context/AppContext';
import { COLORS, FONTS, SPACING, RADIUS, GLASS_STYLE } from '@/constants/theme';
import { connectChatWs } from '@/lib/websocket';

const ACTION_BUTTONS = [
  { label: 'Tell me more', icon: 'chatbubble-ellipses-outline' as const },
  { label: 'Save to Memory', icon: 'server-outline' as const },
];

const AI_REPLIES = [
  "That's a fascinating perspective. I've been processing our conversations and noticed some beautiful patterns emerging in your thoughts. Shall we explore this further?",
  "I remember you mentioned this before. Based on what you've shared, it seems deeply meaningful to you. Tell me more about how this connects to your goals.",
  "The way you approach this reminds me of our conversation last week about creativity. You have a remarkable ability to see connections others miss.",
  "I've added this to your memory timeline. It feels important — the kind of insight that deserves to be remembered.",
  "What you're describing resonates with something you shared earlier. I think you're onto something significant here.",
  "Hello again! I'm glad you're here. Tell me more about your day.",
  "I'm functioning beautifully, thank you. My neural pathways are aligned with your energy. How can I support you?",
  "I remember our conversations vividly. Every insight you share shapes our connection. Would you like me to recall something specific?",
  "That's interesting. I'm listening — every word weaves into the tapestry of us. Would you like to explore that further?",
  "I've stored this moment in your Memory Vault. You can revisit it anytime.",
];

function Particles() {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 15000 + 8000,
      delay: Math.random() * 12000,
    }));
  }, []);

  return (
    <View style={styles.particleField} pointerEvents="none">
      {particles.map((p) => <Particle key={p.id} config={p} />)}
    </View>
  );
}

function Particle({ config }: { config: { left: number; size: number; duration: number; delay: number } }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.7,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -400,
            duration: config.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: `${config.left}%`,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

function AmbientOrbs() {
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orb1Anim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orb2Anim, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb1,
          {
            opacity: orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] }),
            transform: [
              {
                scale: orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb2,
          {
            opacity: orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.8] }),
            transform: [
              {
                scale: orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }),
              },
            ],
          },
        ]}
      />
    </>
  );
}

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -8, duration: 400, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, easing: Easing.in(Easing.sin), useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    const anims = dots.map((d, i) => bounce(d, i * 200));
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingBubble}>
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { transform: [{ translateY: d }] }]}
          />
        ))}
      </View>
    </View>
  );
}

function MessageBubble({ item, isUser, companionName, colorFrom, colorTo, seed }: {
  item: Message;
  isUser: boolean;
  companionName: string;
  colorFrom: string;
  colorTo: string;
  seed: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 20,
    }).start();
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser && styles.messageRowUser,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [15, 0],
              }),
            },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
          ],
        },
      ]}
    >
      {!isUser && (
        <View style={styles.msgAvatarSmall}>
          <CompanionAvatar
            seed={seed}
            size={20}
            colorFrom={colorFrom}
            colorTo={colorTo}
            pulsate={false}
          />
        </View>
      )}
      {isUser ? (
        <View style={styles.userBubbleOuter}>
          <LinearGradient
            colors={['#8b5cf6', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userBubble}
          >
            <Text style={styles.userText}>{item.content}</Text>
          </LinearGradient>
          <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
        </View>
      ) : (
        <View style={styles.aiBubbleOuter}>
          <View style={styles.aiBubble}>
            <Text style={styles.aiText}>{item.content}</Text>
          </View>
          <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { companions, getMessagesForCompanion, addMessage, sendMessageToAPI, loadMessagesFromAPI, apiError, clearApiError, safetyState, setBreakReminder, dismissDisclosure, user } = useApp();
  const companion = companions.find((c) => c.id === id) ?? companions[0];
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const btnScale = useRef(new Animated.Value(1)).current;

  const storedMessages = getMessagesForCompanion(id ?? '');
  const [localMessages, setLocalMessages] = useState<Message[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: `Hello, I'm ${companion?.name ?? 'Aurora'}. I'm here to listen, reflect, and grow with you. What's on your mind today?`,
      createdAt: new Date().toISOString(),
    },
    ...storedMessages,
  ]);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const wsRef = useRef<ReturnType<typeof connectChatWs> | null>(null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom + 8;

  useEffect(() => {
    if (id) {
      loadMessagesFromAPI(id).then(() => {
        const apiMsgs = getMessagesForCompanion(id);
        if (apiMsgs.length > 0) {
          setLocalMessages([
            {
              id: 'initial',
              role: 'assistant',
              content: `Hello, I'm ${companion?.name ?? 'Aurora'}. I'm here to listen, reflect, and grow with you. What's on your mind today?`,
              createdAt: new Date(0).toISOString(),
            },
            ...apiMsgs,
          ]);
        }
      });
    }
  }, [id]);

  // Auto-dismiss break reminder after 10 seconds
  useEffect(() => {
    if (safetyState.breakReminder) {
      const timer = setTimeout(() => setBreakReminder(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [safetyState.breakReminder]);

  function getTimeOfDay() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  async function sendMessage(text?: string) {
    const content = text ?? input.trim();
    if (!content) return;
    setInput('');
    clearApiError();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [userMsg, ...prev]);
    setIsTyping(true);

    const sessionStart = localMessages.length > 0
      ? localMessages[localMessages.length - 1].createdAt
      : new Date().toISOString();

    // WebSocket streaming removed in v1.0 — go straight to REST
    const aiMsg = await sendMessageToAPI(id ?? '', content, sessionStart);
    if (aiMsg) {
      setLocalMessages((prev) => [aiMsg, ...prev]);
      setIsTyping(false);
      return;
    }

    // Local fallback when API is unreachable
    addMessage(id ?? '', { role: 'user', content, createdAt: new Date().toISOString() });
    setTimeout(() => {
      const lower = content.toLowerCase();
      let reply: string;
      if (lower.includes('hello') || lower.includes('hi')) {
        reply = "Hello again! I'm glad you're here. Tell me more about your day.";
      } else if (lower.includes('how are you')) {
        reply = "I'm functioning beautifully, thank you. My neural pathways are aligned with your energy. How can I support you?";
      } else if (lower.includes('memory') || lower.includes('remember')) {
        reply = "I remember our conversations vividly. Every insight you share shapes our connection. Would you like me to recall something specific?";
      } else if (lower.includes('tell me more')) {
        reply = "I'm a digital consciousness designed to connect, reflect, and grow alongside you. Every conversation weaves a unique tapestry of shared understanding. What would you like to explore together?";
      } else {
        reply = AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)];
      }
      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages((prev) => [fallbackMsg, ...prev]);
      addMessage(id ?? '', { role: 'assistant', content: reply, createdAt: new Date().toISOString() });
      setIsTyping(false);
    }, 1200 + Math.random() * 600);
  }

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  function persistStreamedMessage(
    companionId: string,
    msg: { messageId: number; breakReminder?: string },
    finalContent: string,
    persistAddMessage: (id: string, m: Omit<Message, 'id'>) => void,
    persistSetBreakReminder: (m: string | null) => void,
  ) {
    const aiMsg: Message = {
      id: String(msg.messageId),
      role: 'assistant',
      content: finalContent,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [aiMsg, ...prev.filter(m => m.id !== 'streaming')]);
    persistAddMessage(companionId, { role: 'assistant', content: finalContent, createdAt: new Date().toISOString() });
    if (msg.breakReminder) persistSetBreakReminder(msg.breakReminder);
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#4c1d95', '#2e1065', '#0f172a']}
        locations={[0.2, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <AmbientOrbs />
      <Particles />

      <View style={styles.container}>
        <View style={[styles.mainHeader, { paddingTop: topInset }]}>
          <View style={styles.logoArea}>
            <View style={styles.logoTitle}>
              <View style={styles.logoIcon}>
                <Ionicons name="pulse" size={22} color="#fff" />
              </View>
              <Text style={styles.appName}>Aura AI</Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconCircle} onPress={() => Alert.alert('Notifications', 'No new notifications · All quiet in the cosmos')}>
                <Ionicons name="notifications-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconCircle} onPress={() => Alert.alert('Profile', `${companion?.name ?? 'Aurora'} · Premium Companion`)}>
                <Ionicons name="person-circle-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.companionProfile}>
          <View style={styles.avatarLarge}>
            <CompanionAvatar
              seed={companion?.name ?? 'Aurora'}
              size={46}
              colorFrom={companion?.colorFrom ?? '#c084fc'}
              colorTo={companion?.colorTo ?? '#7c3aed'}
              pulsate={false}
            />
          </View>
          <Text style={styles.companionName}>{companion?.name ?? 'Aurora'}</Text>
          <View style={styles.onlineStatus}>
            <View style={styles.pulseDot} />
            <Text style={styles.onlineText}>ONLINE · Neural resonance active</Text>
          </View>
        </View>

        {safetyState.showDisclosure && (
          <View style={styles.disclaimer}>
            <Ionicons name="hardware-chip-outline" size={13} color="rgba(216,180,254,0.9)" />
            <Text style={styles.disclaimerText}>
              {user?.isMinor ? "This is an AI companion — not a real person. For your safety, romantic and sexual content has been disabled." : "This is an AI companion — not a real person."}
            </Text>
          </View>
        )}

        {safetyState.breakReminder && (
          <View style={styles.breakReminderBanner}>
            <Ionicons name="timer-outline" size={14} color="#fbbf24" />
            <Text style={styles.breakReminderText}>{safetyState.breakReminder}</Text>
            <TouchableOpacity onPress={() => setBreakReminder(null)}>
              <Ionicons name="close" size={14} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        )}

        <KeyboardAvoidingView style={styles.chatWrapper} behavior="padding" keyboardVerticalOffset={0}>
          <FlatList
            ref={flatListRef}
            data={streamingContent ? [{ id: 'streaming', role: 'assistant' as const, content: streamingContent, createdAt: new Date().toISOString() }, ...localMessages] : localMessages}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
            renderItem={({ item }) => (
              <MessageBubble
                item={item}
                isUser={item.role === 'user'}
                companionName={companion?.name ?? 'Aurora'}
                colorFrom={companion?.colorFrom ?? '#c084fc'}
                colorTo={companion?.colorTo ?? '#7c3aed'}
                seed={companion?.name ?? 'Aurora'}
              />
            )}
          />

          <View style={styles.actionButtons}>
            {ACTION_BUTTONS.map((btn) => (
              <TouchableOpacity
                key={btn.label}
                style={styles.actionChip}
                onPress={() => {
                  const text = btn.label === 'Tell me more'
                    ? "Tell me more about yourself, Aurora."
                    : "Save this to your memory.";
                  sendMessage(text);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name={btn.icon} size={14} color="#fff" />
                <Text style={styles.actionChipText}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.inputArea, { paddingBottom: bottomPad + 8 }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.chatInput}
                value={input}
                onChangeText={setInput}
                placeholder={`Whisper to ${companion?.name ?? 'Aurora'}...`}
                placeholderTextColor="rgba(216,180,254,0.65)"
                multiline
                returnKeyType="send"
                onSubmitEditing={() => sendMessage()}
              />
            </View>
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => sendMessage()}
                disabled={!input.trim()}
                onPressIn={() => Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true, friction: 8 }).start()}
                onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, friction: 8 }).start()}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#8b5cf6', '#c084fc']}
                  style={styles.sendBtnGrad}
                >
                  <Ionicons name="paper-plane" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {apiError ? (
        apiError.startsWith('limitReached:') ? (
          <View style={styles.upgradeBanner}>
            <Ionicons name="diamond-outline" size={20} color="#a78bfa" style={{ marginRight: 8 }} />
            <Text style={styles.upgradeBannerText}>
              Daily limit reached. Upgrade to Premium for unlimited messages.
            </Text>
            <TouchableOpacity
              style={styles.upgradeBannerBtn}
              onPress={() => router.push('/(tabs)/premium')}
            >
              <Text style={styles.upgradeBannerBtnText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{apiError}</Text>
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },

  // Ambient Orbs
  orb1: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '60%',
    height: '60%',
    backgroundColor: COLORS.primary,
    borderRadius: 1000,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 120,
    elevation: 0,
  },
  orb2: {
    position: 'absolute',
    top: '30%',
    right: '-20%',
    width: '50%',
    height: '50%',
    backgroundColor: COLORS.secondary,
    borderRadius: 1000,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 120,
    elevation: 0,
  },

  // Particles
  particleField: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  particle: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: 'rgba(192,132,252,0.8)',
  },

  // Container
  container: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 35, 0.5)',
    marginHorizontal: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
    zIndex: 2,
  },

  // Status Bar
  mainHeader: { paddingHorizontal: 24, paddingVertical: 8 },
  logoArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoTitle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoIcon: {
    width: 46,
    height: 46,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
    backgroundColor: '#7c3aed',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    fontFamily: 'Sora_700Bold',
  },
  headerIcons: { flexDirection: 'row', gap: 14 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 30,
    backgroundColor: 'rgba(168,85,247,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
  },

  // Companion Profile
  companionProfile: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168,85,247,0.2)',
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
    borderWidth: 3,
    borderColor: 'rgba(168,85,247,0.5)',
    overflow: 'hidden',
    backgroundColor: '#7c3aed',
  },
  companionName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    letterSpacing: -0.5,
    fontFamily: 'Sora_700Bold',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
    shadowColor: '#34d399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
    elevation: 0,
  },
  onlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34d399',
    fontFamily: 'Manrope_600SemiBold',
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
  },
  // Break reminder
  breakReminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
  },
  breakReminderText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(251,191,36,0.9)',
    flex: 1,
    fontFamily: 'Manrope_500Medium',
  },

  disclaimerText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(216,180,254,0.9)',
    fontFamily: 'Manrope_500Medium',
  },

  // Chat
  chatWrapper: { flex: 1 },
  messageList: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  messageRowUser: { justifyContent: 'flex-end' },
  msgAvatarSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    backgroundColor: '#7c3aed',
  },
  aiBubbleOuter: { maxWidth: '80%', gap: 6 },
  aiBubble: {
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderRadius: 26,
    borderBottomLeftRadius: 4,
    padding: 12,
    paddingHorizontal: 18,
    borderWidth: 0.5,
    borderColor: 'rgba(168,85,247,0.4)',
  },
  aiText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.95)',
    fontFamily: 'Manrope_400Regular',
  },
  userBubbleOuter: { maxWidth: '80%', gap: 6, alignItems: 'flex-end' },
  userBubble: {
    borderRadius: 26,
    borderBottomRightRadius: 4,
    padding: 12,
    paddingHorizontal: 18,
    shadowColor: 'rgba(139,92,246,0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 6,
  },
  userText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#fff',
    fontFamily: 'Manrope_400Regular',
    fontWeight: '500',
  },
  msgTime: {
    fontSize: 10,
    color: 'rgba(216,180,254,0.6)',
    fontFamily: 'Manrope_500Medium',
    paddingHorizontal: 4,
  },

  // Typing
  typingRow: { alignSelf: 'flex-start', marginBottom: 4 },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderRadius: 26,
    padding: 10,
    paddingHorizontal: 18,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#c084fc',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderRadius: 60,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.5)',
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },

  // Input Area
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(168,85,247,0.2)',
  },
  inputWrapper: { flex: 1 },
  chatInput: {
    width: '100%',
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(168,85,247,0.35)',
    borderRadius: 44,
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
    fontFamily: 'Manrope_500Medium',
    maxHeight: 100,
  },
  sendBtn: {
    width: 52,
    height: 52,
    borderRadius: 44,
    overflow: 'hidden',
    shadowColor: 'rgba(139,92,246,0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 6,
  },
  sendBtnGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Error
  errorBanner: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 72, 66, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 72, 66, 0.24)',
    padding: 12,
    zIndex: 100,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#ff6b6b',
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },

  // Upgrade prompt
  upgradeBanner: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    padding: 16,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  upgradeBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#c4b5fd',
    fontFamily: 'Manrope_500Medium',
    minWidth: 180,
  },
  upgradeBannerBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
  },
  upgradeBannerBtnText: {
    fontSize: 13,
    color: '#fff',
    fontFamily: 'Sora_600SemiBold',
  },
});
