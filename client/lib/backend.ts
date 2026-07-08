// ════════════════════════════════════════════════════════════════════════
// THE SEAM SWITCH — every backend call in the app imports from this module,
// which picks the implementation once, at bundle time:
//
//   DEV_USE_MOCKS on  (dev default)            → lib/mock.ts  (fully local)
//   DEV_USE_MOCKS off (EXPO_PUBLIC_USE_MOCKS=false, or any release build)
//                                              → lib/live.ts  (Clerk + REST + RevenueCat)
//
// The `Omit<typeof mock, …>` annotation is the contract check: lib/live.ts
// must export the same functions with the same signatures (mock-only helpers
// exempted below), so the two modes cannot drift apart silently.
// ════════════════════════════════════════════════════════════════════════
import { DEV_USE_MOCKS } from '@/constants/devFlags';
import { liveConfigGaps } from '@/lib/env';
import * as live from '@/lib/live';
import * as mock from '@/lib/mock';

type Seams = Omit<
  typeof mock,
  'mockVoiceReply' | 'VOICE_FREE_SECONDS' | 'VOICE_PREMIUM_SECONDS'
>;

const impl: Seams = DEV_USE_MOCKS ? mock : live;

if (__DEV__) {
  if (DEV_USE_MOCKS) {
    console.log('[backend] MOCK mode — set EXPO_PUBLIC_USE_MOCKS=false in client/.env to go live');
  } else {
    const gaps = liveConfigGaps();
    console.log(
      `[backend] LIVE mode${gaps.length ? ` — missing env: ${gaps.join(', ')} (those seams will fail)` : ''}`,
    );
  }
}

// Auth
export const authLogin = impl.authLogin;
export const authRegister = impl.authRegister;
export const authVerifyEmail = impl.authVerifyEmail;
export const authResendCode = impl.authResendCode;
export const authSignOut = impl.authSignOut;

// Bootstrap + profile
export const hydrate = impl.hydrate;
export const updateMe = impl.updateMe;
export const fetchAccountStatus = impl.fetchAccountStatus;

// Chat + memories + safety
export const sendTurn = impl.sendTurn;
export const fetchMemories = impl.fetchMemories;
export const updateMemory = impl.updateMemory;
export const deleteMemory = impl.deleteMemory;
export const reportMessage = impl.reportMessage;

// Companions (remote mirrors of the optimistic local writes)
export const remoteCreateCompanion = impl.remoteCreateCompanion;
export const remoteUpdateCompanion = impl.remoteUpdateCompanion;
export const remoteArchiveCompanion = impl.remoteArchiveCompanion;
export const remoteRestoreCompanion = impl.remoteRestoreCompanion;
export const remoteDeleteCompanion = impl.remoteDeleteCompanion;
export const remoteClearConversation = impl.remoteClearConversation;
export const remoteForgetCompanion = impl.remoteForgetCompanion;
export const remoteSetPrimary = impl.remoteSetPrimary;

// Account lifecycle
export const softDeleteAccount = impl.softDeleteAccount;
export const reactivateAccount = impl.reactivateAccount;
export const requestDataExport = impl.requestDataExport;

// Payments + entitlements
export const configurePayments = impl.configurePayments;
export const fetchStorePrice = impl.fetchStorePrice;
export const purchasePremium = impl.purchasePremium;
export const restorePurchases = impl.restorePurchases;
export const fetchEntitlements = impl.fetchEntitlements;
export const fetchRenewalDate = impl.fetchRenewalDate;

// Voice metering
export const fetchVoiceUsage = impl.fetchVoiceUsage;

// Mock-only in BOTH modes for now: the voice-call caption loop stays local
// until the voice WS arc lands, and the shared voice-limit constants are
// mode-independent.
export { mockVoiceReply, VOICE_FREE_SECONDS, VOICE_PREMIUM_SECONDS } from '@/lib/mock';

export type { AccountStatus, Companion, Hydration, MemoryRow, Message, TurnRequest, TurnResult } from '@/lib/models';
