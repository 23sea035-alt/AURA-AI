// ═══════════════════════════════════════════════════════════════════════
// DEV-ONLY registry — every deterministic way to force app states without
// live backend data or storage surgery lives (or is indexed) here.
//
//   DEV_USE_MOCKS          the mock/live seam switch (see below).
//   DEV_FORCE_PREMIUM      flip to preview premium-gated UI everywhere
//                          (applied once, in AppContext's exposedUser).
//   "##fail" in a message  simulated network failure → failed-send state
//                          (lib/mock.ts sendTurn dev trigger).
//   "##block" in a message simulated moderation hold → blocked-send state
//                          (lib/mock.ts sendTurn dev trigger).
//   crisis phrases         "hopeless", "won't get better", … → grounding
//                          crisis card (lib/mock.ts CRISIS_PATTERN).
//   sim storage staging    client/scripts/dev/sim-storage.py — inspect/
//                          stage/reset AsyncStorage on the booted sim
//                          (voice meter, usage counter, message history).
//
// Everything is gated on `__DEV__` so a value left `true` can never leak
// into a release build.
// ═══════════════════════════════════════════════════════════════════════

// Default OFF: the canonical demo story (Maya, free tier, 18/30 counter,
// paywall) reads free.
export const DEV_FORCE_PREMIUM = __DEV__ && false;

// The mock/live switch (lib/backend.ts dispatches every seam on this).
//   Dev default: MOCKS ON — the app runs fully local, no backend needed.
//   Go live in dev: set EXPO_PUBLIC_USE_MOCKS=false in client/.env, restart
//   Metro (env vars are inlined at bundle time — a reload is not enough).
//   Release builds: always live; the `__DEV__ &&` guard makes mock mode
//   unreachable in production no matter what the env says.
export const DEV_USE_MOCKS = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS !== 'false';
