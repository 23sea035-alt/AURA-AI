// Clerk session layer for LIVE mode. Only lib/live.ts and app/_layout.tsx
// import this; in mock mode none of it executes (the provider isn't mounted
// and no seam calls in). Uses the imperative singleton (getClerkInstance) so
// AppContext keeps its plain async login/register functions — no hook plumbing
// through screens.
import { getClerkInstance, isClerkAPIResponseError } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';

import { setTokenProvider } from '@/lib/api';
import { CLERK_PUBLISHABLE_KEY } from '@/lib/env';

export { tokenCache };

export const clerkEnabled = !!CLERK_PUBLISHABLE_KEY;

function instance() {
  return getClerkInstance({ publishableKey: CLERK_PUBLISHABLE_KEY, tokenCache });
}

// The singleton loads asynchronously (ClerkProvider kicks it off at mount);
// imperative calls that race the first load wait it out here.
async function loaded() {
  const clerk = instance();
  const started = Date.now();
  while (!clerk.loaded) {
    if (Date.now() - started > 10_000) throw new Error('Clerk failed to load');
    await new Promise((r) => setTimeout(r, 100));
  }
  return clerk;
}

// Every live request signs with the current session's JWT.
setTokenProvider(async () => {
  if (!clerkEnabled) return null;
  try {
    return (await loaded()).session?.getToken() ?? null;
  } catch {
    return null;
  }
});

/** Human-readable message out of a Clerk API error (field issues included). */
function friendly(err: unknown): Error {
  if (isClerkAPIResponseError(err)) {
    const first = err.errors?.[0];
    return new Error(first?.longMessage ?? first?.message ?? 'Something went wrong');
  }
  return err instanceof Error ? err : new Error('Something went wrong');
}

export async function clerkSignIn(email: string, password: string): Promise<void> {
  const clerk = await loaded();
  try {
    const attempt = await clerk.client!.signIn.create({ identifier: email, password });
    if (attempt.status !== 'complete') throw new Error('Additional verification required');
    await clerk.setActive({ session: attempt.createdSessionId });
  } catch (err) {
    throw friendly(err);
  }
}

/** Creates the sign-up and sends the six-digit email code (verify-email screen). */
export async function clerkSignUp(email: string, password: string): Promise<void> {
  const clerk = await loaded();
  try {
    await clerk.client!.signUp.create({ emailAddress: email, password });
    await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
  } catch (err) {
    throw friendly(err);
  }
}

export async function clerkVerifyEmail(code: string): Promise<void> {
  const clerk = await loaded();
  try {
    const attempt = await clerk.client!.signUp.attemptEmailAddressVerification({ code });
    if (attempt.status !== 'complete') throw new Error('Verification incomplete');
    await clerk.setActive({ session: attempt.createdSessionId });
  } catch (err) {
    throw friendly(err);
  }
}

export async function clerkResendCode(): Promise<void> {
  const clerk = await loaded();
  try {
    await clerk.client!.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
  } catch (err) {
    throw friendly(err);
  }
}

export async function clerkSignOut(): Promise<void> {
  const clerk = await loaded();
  await clerk.signOut();
}

export async function clerkHasSession(): Promise<boolean> {
  if (!clerkEnabled) return false;
  try {
    return !!(await loaded()).session;
  } catch {
    return false;
  }
}
