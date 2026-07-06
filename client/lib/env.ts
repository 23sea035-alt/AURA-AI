// Build-time client configuration. EXPO_PUBLIC_* vars are inlined by Metro at
// bundle time — changing client/.env requires a Metro restart, not a reload.
// The mock/live switch itself lives in constants/devFlags (DEV_USE_MOCKS).
import { Platform } from 'react-native';

/** Base REST URL, always ending in /api (no trailing slash). */
export function apiBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  // Replit-style shared dev domain (kept for compat with the old setup).
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  // Local dev: the iOS sim reaches the Mac's localhost directly; the Android
  // emulator NATs the host behind 10.0.2.2.
  if (Platform.OS === 'android') return 'http://10.0.2.2:8080/api';
  return 'http://localhost:8080/api';
}

/** The WS endpoint shares the HTTP server (server upgrades on any path). */
export function wsBaseUrl(): string {
  return apiBaseUrl().replace(/^http/, 'ws').replace(/\/api$/, '/ws');
}

export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

/** RevenueCat public SDK key (Test Store key while we're pre-App Store). */
export const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

/** RevenueCat product ids (dashboard: Test Store products). */
export const RC_PRODUCT_MONTHLY = 'aura_premium_monthly';
export const RC_PRODUCT_YEARLY = 'aura_premium_yearly';

/** What live mode is missing, for a loud boot warning instead of a silent hang. */
export function liveConfigGaps(): string[] {
  const gaps: string[] = [];
  if (!CLERK_PUBLISHABLE_KEY) gaps.push('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
  if (!REVENUECAT_IOS_KEY) gaps.push('EXPO_PUBLIC_REVENUECAT_IOS_KEY');
  return gaps;
}
