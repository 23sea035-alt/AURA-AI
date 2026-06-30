import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  apiLogin, apiRegister, apiGetMe, apiUpdateMe,
  apiGetCompanions, apiCreateCompanion,
  apiGetMessages, apiSendMessage,
  ApiUser, ApiCompanion, ApiMessage,
} from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Companion {
  id: string;
  name: string;
  persona: string;
  traits: string[];
  colorFrom: string;
  colorTo: string;
  lastMessage?: string;
  lastActive?: string;
  messageCount?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  /** Local URI of the captured audio clip when the message was dictated (push-to-talk). */
  audioUri?: string;
  /** How the user composed the message. Absent = text. */
  inputModality?: 'text' | 'voice';
}

export interface UserProfile {
  id?: number;
  name: string;
  email: string;
  birthYear?: number;
  isMinor?: boolean;
  ageVerified?: boolean;
  onboardingDone?: boolean;
  aiDisclosureAccepted?: boolean;
  isPremium?: boolean;
  bio?: string;
  avatarUri?: string;
}

export interface SafetyState {
  breakReminder: string | null;
  showDisclosure: boolean;
}

interface AppContextType {
  user: UserProfile | null;
  companions: Companion[];
  isAuthenticated: boolean;
  isLoading: boolean;
  messages: Record<string, Message[]>;
  apiError: string | null;
  safetyState: SafetyState;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, birthYear: number) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  addCompanion: (companion: Omit<Companion, 'id'>) => void;
  getMessagesForCompanion: (companionId: string) => Message[];
  addMessage: (companionId: string, message: Omit<Message, 'id'>) => void;
  sendMessageToAPI: (companionId: string, content: string, sessionStartedAt?: string) => Promise<Message | null>;
  loadMessagesFromAPI: (companionId: string) => Promise<void>;
  clearApiError: () => void;
  setBreakReminder: (message: string | null) => void;
  dismissDisclosure: () => void;
  startCheckout: () => Promise<string | null>;
}

const AppContext = createContext<AppContextType | null>(null);

// ── Default companions (shown before API loads) ────────────────────────────

const DEFAULT_COMPANIONS: Companion[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    persona: 'Empathetic, wise, and deeply curious. Aurora specializes in emotional support, creative exploration, and reflective conversations.',
    traits: ['Empathetic', 'Creative', 'Wise', 'Curious'],
    colorFrom: '#c9bfff',
    colorTo: '#8fd8ff',
    lastMessage: 'Ready to explore your thoughts with you...',
    lastActive: 'Active now',
    messageCount: 0,
  },
  {
    id: 'orion',
    name: 'Orion',
    persona: 'Strategic, analytical, and motivating. Orion excels at goal-setting, problem-solving, and keeping you accountable.',
    traits: ['Strategic', 'Analytical', 'Motivating'],
    colorFrom: '#8fd8ff',
    colorTo: '#c9bfff',
    lastMessage: "Let's tackle your goals today.",
    lastActive: '2m ago',
    messageCount: 0,
  },
  {
    id: 'lyra',
    name: 'Lyra',
    persona: 'Playful, imaginative, and storytelling. Lyra loves creative writing, roleplay, and bringing stories to life.',
    traits: ['Playful', 'Imaginative', 'Creative'],
    colorFrom: '#ffb77d',
    colorTo: '#8fd8ff',
    lastMessage: 'What story shall we write today?',
    lastActive: '1h ago',
    messageCount: 0,
  },
];

function toCompanion(c: ApiCompanion): Companion {
  return {
    id: c.id,
    name: c.name,
    persona: c.persona,
    traits: c.traits ?? [],
    colorFrom: c.colorFrom,
    colorTo: c.colorTo,
    lastMessage: c.lastMessage ?? undefined,
    lastActive: c.lastActive ?? undefined,
    messageCount: c.messageCount,
  };
}

function toMessage(m: ApiMessage): Message {
  return {
    id: String(m.id),
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
  };
}

function toUserProfile(u: ApiUser): UserProfile {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    birthYear: u.birthYear ?? undefined,
    isMinor: u.isMinor,
    ageVerified: u.ageVerified,
    onboardingDone: u.onboardingDone,
    aiDisclosureAccepted: u.aiDisclosureAccepted,
    isPremium: u.isPremium,
  };
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [companions, setCompanions] = useState<Companion[]>(DEFAULT_COMPANIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [safetyState, setSafetyState] = useState<SafetyState>({
    breakReminder: null,
    showDisclosure: true,
  });

  useEffect(() => { bootstrap(); }, []);

  const bootstrap = async () => {
    try {
      // Try AsyncStorage first for fast startup
      const [storedUser, storedMessages, storedCompanions, token] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('messages'),
        AsyncStorage.getItem('companions'),
        AsyncStorage.getItem('authToken'),
      ]);

      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedMessages) setMessages(JSON.parse(storedMessages));
      if (storedCompanions) setCompanions(JSON.parse(storedCompanions));

      // If we have a token, refresh from API in the background
      if (token) {
        refreshFromAPI();
      }
    } catch {}
    setIsLoading(false);
  };

  const refreshFromAPI = async () => {
    try {
      const [meRes, companionsRes] = await Promise.all([apiGetMe(), apiGetCompanions()]);
      if (meRes.data) {
        const profile = toUserProfile(meRes.data);
        setUser(profile);
        await AsyncStorage.setItem('user', JSON.stringify(profile));
      }
      if (companionsRes.data) {
        const comps = companionsRes.data.map(toCompanion);
        setCompanions(comps);
        await AsyncStorage.setItem('companions', JSON.stringify(comps));
      }
    } catch {}
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await apiLogin(email, password);
    if (error || !data) {
      // Fallback: local login for offline mode
      const profile: UserProfile = {
        name: email.split('@')[0],
        email,
        ageVerified: true,
        onboardingDone: true,
        aiDisclosureAccepted: true,
        isPremium: false,
      };
      setUser(profile);
      await AsyncStorage.setItem('user', JSON.stringify(profile));
      if (error) setApiError(null); // suppress - fallback worked
      return;
    }
    await AsyncStorage.setItem('authToken', data.token);
    const profile = toUserProfile(data.user);
    setUser(profile);
    await AsyncStorage.setItem('user', JSON.stringify(profile));

    // Load companions from API
    const { data: comps } = await apiGetCompanions();
    if (comps) {
      const mapped = comps.map(toCompanion);
      setCompanions(mapped);
      await AsyncStorage.setItem('companions', JSON.stringify(mapped));
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, birthYear: number = new Date().getFullYear() - 18) => {
    const { data, error } = await apiRegister(name, email, password, birthYear);
    if (error || !data) {
      // Fallback: local registration
      const profile: UserProfile = {
        name,
        email,
        birthYear,
        ageVerified: false,
        onboardingDone: false,
        aiDisclosureAccepted: false,
        isPremium: false,
      };
      setUser(profile);
      await AsyncStorage.setItem('user', JSON.stringify(profile));
      return;
    }
    await AsyncStorage.setItem('authToken', data.token);
    const profile = toUserProfile(data.user);
    setUser(profile);
    await AsyncStorage.setItem('user', JSON.stringify(profile));

    // Load companions seeded by the server
    const { data: comps } = await apiGetCompanions();
    if (comps) {
      const mapped = comps.map(toCompanion);
      setCompanions(mapped);
      await AsyncStorage.setItem('companions', JSON.stringify(mapped));
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setCompanions(DEFAULT_COMPANIONS);
    setMessages({});
    await AsyncStorage.multiRemove(['user', 'authToken', 'companions', 'messages']);
  }, []);

  const updateUser = useCallback(async (updates: Partial<UserProfile>) => {
    // Optimistic local update
    setUser(prev => {
      const updated = prev ? { ...prev, ...updates } : (updates as UserProfile);
      AsyncStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
    // Sync to API
    try {
      const { data } = await apiUpdateMe(updates as any);
      if (data) {
        const profile = toUserProfile(data);
        setUser(profile);
        await AsyncStorage.setItem('user', JSON.stringify(profile));
      }
    } catch {}
  }, []);

  const addCompanion = useCallback(async (companion: Omit<Companion, 'id'>) => {
    // Try API first
    const { data, error } = await apiCreateCompanion({
      name: companion.name,
      persona: companion.persona,
      traits: companion.traits,
      colorFrom: companion.colorFrom,
      colorTo: companion.colorTo,
    });

    const newCompanion: Companion = data
      ? toCompanion(data)
      : {
          ...companion,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        };

    setCompanions(prev => {
      const updated = [newCompanion, ...prev];
      AsyncStorage.setItem('companions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getMessagesForCompanion = useCallback((companionId: string): Message[] => {
    return messages[companionId] ?? [];
  }, [messages]);

  const addMessage = useCallback((companionId: string, message: Omit<Message, 'id'>) => {
    const newMsg: Message = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setMessages(prev => {
      const updated = { ...prev, [companionId]: [...(prev[companionId] ?? []), newMsg] };
      AsyncStorage.setItem('messages', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const sendMessageToAPI = useCallback(async (
    companionId: string,
    content: string,
    sessionStartedAt?: string
  ): Promise<Message | null> => {
    const { data, error, errorData } = await apiSendMessage(companionId, content, sessionStartedAt);
    if (error || !data) {
      if (errorData?.limitReached) {
        setApiError(`limitReached:${errorData.used}/${errorData.limit}`);
      } else if (error) {
        setApiError(error);
      }
      return null;
    }

    setApiError(null);
    const aiMsg = toMessage(data.aiMessage);
    setMessages(prev => {
      const updated = {
        ...prev,
        [companionId]: [...(prev[companionId] ?? []), aiMsg],
      };
      AsyncStorage.setItem('messages', JSON.stringify(updated));
      return updated;
    });

    // Update companion lastMessage
    setCompanions(prev =>
      prev.map(c =>
        c.id === companionId
          ? { ...c, lastMessage: content.slice(0, 80), lastActive: 'Just now', messageCount: (c.messageCount ?? 0) + 1 }
          : c
      )
    );

    // Handle break reminder from API
    if (data.breakReminder) {
      setSafetyState(prev => ({ ...prev, breakReminder: data.breakReminder! }));
    }

    return aiMsg;
  }, []);

  const loadMessagesFromAPI = useCallback(async (companionId: string) => {
    const { data } = await apiGetMessages(companionId);
    if (!data) return;
    const msgs = data.map(toMessage);
    setMessages(prev => {
      const updated = { ...prev, [companionId]: msgs };
      AsyncStorage.setItem('messages', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearApiError = useCallback(() => setApiError(null), []);

  const setBreakReminder = useCallback((message: string | null) => {
    setSafetyState(prev => ({ ...prev, breakReminder: message }));
  }, []);

  const dismissDisclosure = useCallback(() => {
    setSafetyState(prev => ({ ...prev, showDisclosure: false }));
  }, []);

  const startCheckout = useCallback(async (): Promise<string | null> => {
    const { data, error } = await import('@/lib/api').then(m => m.apiCreateCheckoutSession());
    if (error || !data?.url) {
      setApiError(error ?? 'Failed to start checkout');
      return null;
    }
    return data.url;
  }, []);

  return (
    <AppContext.Provider value={{
      user, companions, isAuthenticated: !!user, isLoading,
      messages, apiError, safetyState,
      login, register, logout, updateUser,
      addCompanion, getMessagesForCompanion, addMessage,
      sendMessageToAPI, loadMessagesFromAPI, clearApiError,
      setBreakReminder, dismissDisclosure, startCheckout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
