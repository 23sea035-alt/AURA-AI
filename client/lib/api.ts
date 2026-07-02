import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// In Replit, EXPO_PUBLIC_DOMAIN is the shared dev domain (API server on port 80 = externalPort 80)
// The API server mounts at /api
function getBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  // Fallback for local dev
  if (Platform.OS === 'android') return 'http://10.0.2.2:8080/api';
  return 'http://localhost:8080/api';
}

async function getToken(): Promise<string | null> {
  try { return await AsyncStorage.getItem('authToken'); } catch { return null; }
}

interface ApiErrorData {
  error: string;
  limitReached?: boolean;
  used?: number;
  limit?: number;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null; errorData?: ApiErrorData }> {
  try {
    const token = await getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${getBaseUrl()}${path}`, {
      ...options,
      headers,
    });

    const json = await res.json();
    if (!res.ok) return { data: null, error: json.error ?? `HTTP ${res.status}`, errorData: json };
    return { data: json as T, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Network error' };
  }
}

// ── Auth ───────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  birthYear?: number;
  isPremium: boolean;
  isMinor: boolean;
  ageVerified: boolean;
  onboardingDone: boolean;
  aiDisclosureAccepted: boolean;
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
}

export async function apiRegister(name: string, email: string, password: string, birthYear: number) {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, birthYear }),
  });
}

export async function apiLogin(email: string, password: string) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGetMe() {
  return apiFetch<ApiUser>('/auth/me');
}

export async function apiUpdateMe(updates: Partial<ApiUser & { name: string; email: string }>) {
  return apiFetch<ApiUser>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ── Companions ─────────────────────────────────────────────────────────────

export interface ApiCompanion {
  id: string;
  userId: number;
  name: string;
  persona: string;
  traits: string[];
  colorFrom: string;
  colorTo: string;
  lastMessage?: string;
  lastActive?: string;
  messageCount: number;
  isDefault: boolean;
  createdAt: string;
}

export async function apiGetCompanions() {
  return apiFetch<ApiCompanion[]>('/companions');
}

export async function apiCreateCompanion(data: {
  name: string; persona: string; traits: string[];
  colorFrom: string; colorTo: string;
}) {
  return apiFetch<ApiCompanion>('/companions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateCompanion(id: string, updates: Partial<ApiCompanion>) {
  return apiFetch<ApiCompanion>(`/companions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ── Chat / Messages ────────────────────────────────────────────────────────

export interface ApiMessage {
  id: number;
  companionId: string;
  userId: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatResponse {
  userMessage: ApiMessage;
  aiMessage: ApiMessage;
  safetyFlagged?: boolean;
  memoriesUsed?: boolean;
  breakReminder?: string;
}

export async function apiGetMessages(companionId: string) {
  return apiFetch<ApiMessage[]>(`/companions/${companionId}/messages`);
}

export async function apiSendMessage(companionId: string, content: string, sessionStartedAt?: string) {
  return apiFetch<ChatResponse>(`/companions/${companionId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ content, sessionStartedAt }),
  });
}

/** Flag an assistant message (Apple Guideline 1.2 / UGC). `reason` is a chip label; `detail` is the
 *  optional free-text note. Server records a safety_event for review. Best-effort, non-blocking. */
export async function apiReportMessage(messageId: string, reason: string, detail?: string) {
  return apiFetch<{ reported: boolean }>(`/messages/${messageId}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason, detail }),
  });
}

// ── Payments ──────────────────────────────────────────────────────────────

export interface CheckoutResponse {
  url: string | null;
  sessionId: string;
}

export async function apiCreateCheckoutSession() {
  return apiFetch<CheckoutResponse>('/payments/create-checkout-session', {
    method: 'POST',
  });
}

// ── Voice ──────────────────────────────────────────────────────────────────

export interface SttResponse {
  text: string;
}

export async function apiStt(audioBase64: string) {
  return apiFetch<SttResponse>('/voice/stt', {
    method: 'POST',
    body: JSON.stringify({ audio: audioBase64 }),
  });
}

export async function apiTts(text: string): Promise<{ data: ArrayBuffer | null; error: string | null }> {
  try {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${getBaseUrl()}/voice/tts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const json = await res.json();
      return { data: null, error: json.error ?? `HTTP ${res.status}` };
    }
    return { data: await res.arrayBuffer(), error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? 'Network error' };
  }
}
