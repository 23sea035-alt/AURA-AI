// RevenueCat layer for LIVE mode (Test Store while we're pre-App Store; the
// same code path serves the real store later — only the dashboard key changes).
// Only lib/live.ts imports this; mock mode never calls configure, so the
// native module stays untouched.
//
// Server-side truth: RevenueCat calls our webhook (POST /api/payments/webhook)
// and the server flips users.isPremium; the client's fast path is the SDK's
// CustomerInfo (any active entitlement counts — the server grants by event
// type, not entitlement name), reconciled against GET /api/payments/entitlements
// on the next foreground.
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { RC_PRODUCT_MONTHLY, RC_PRODUCT_YEARLY, REVENUECAT_IOS_KEY } from '@/lib/env';

const purchasesEnabled = !!REVENUECAT_IOS_KEY;

let configuredFor: string | null = null;

/**
 * Configure the SDK bound to our LOCAL user UUID — the server's webhook
 * handler validates app_user_id against the users table, so the Clerk id or
 * an anonymous id would silently drop entitlements.
 */
export async function configurePurchases(appUserId: string): Promise<void> {
  if (!purchasesEnabled || !appUserId) return;
  if (configuredFor === appUserId) return;
  if (configuredFor === null) {
    Purchases.configure({ apiKey: REVENUECAT_IOS_KEY, appUserID: appUserId });
  } else {
    await Purchases.logIn(appUserId);
  }
  configuredFor = appUserId;
}

async function findPackage(productId: string): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const packs = [
    ...(offerings.current?.availablePackages ?? []),
    ...Object.values(offerings.all).flatMap((o) => o.availablePackages),
  ];
  return packs.find((p) => p.product.identifier === productId) ?? null;
}

/** Localized store price strings for the paywall (null slot = skeleton, never hardcoded). */
export async function getPremiumPrices(): Promise<{ monthly: string | null; yearly: string | null }> {
  if (!purchasesEnabled) return { monthly: null, yearly: null };
  try {
    const [monthly, yearly] = await Promise.all([
      findPackage(RC_PRODUCT_MONTHLY),
      findPackage(RC_PRODUCT_YEARLY),
    ]);
    return {
      monthly: monthly?.product.priceString ?? null,
      yearly: yearly?.product.priceString ?? null,
    };
  } catch {
    return { monthly: null, yearly: null };
  }
}

function hasActiveEntitlement(info: { entitlements: { active: Record<string, unknown> } }): boolean {
  return Object.keys(info.entitlements.active).length > 0;
}

/** Runs the store purchase; resolves false (not throws) on user cancel. */
export async function purchasePlan(plan: 'monthly' | 'yearly'): Promise<boolean> {
  if (!purchasesEnabled) throw new Error('Purchases are not configured');
  const pack = await findPackage(plan === 'yearly' ? RC_PRODUCT_YEARLY : RC_PRODUCT_MONTHLY);
  if (!pack) throw new Error('Plan is not available right now');
  try {
    const { customerInfo } = await Purchases.purchasePackage(pack);
    return hasActiveEntitlement(customerInfo);
  } catch (err) {
    if ((err as { userCancelled?: boolean })?.userCancelled) return false;
    throw err;
  }
}

export async function restoreFromStore(): Promise<boolean> {
  if (!purchasesEnabled) return false;
  return hasActiveEntitlement(await Purchases.restorePurchases());
}

/**
 * Localized renewal date of the active subscription ("Jul 14, 2026"), or null when there's
 * no active entitlement / the SDK is unconfigured — callers hide the "Renews …" line on null.
 */
export async function getRenewalDate(): Promise<string | null> {
  if (!purchasesEnabled) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    const iso = info.latestExpirationDate;
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
}
