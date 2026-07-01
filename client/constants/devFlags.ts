// DEV-ONLY mock overrides for previewing gated UI without live backend state. Gated on `__DEV__`
// so a value left `true` here can never leak into a release build. Toggle here, not per-screen —
// every screen reads `user.isPremium` off AppContext, which is the single place this is applied.
export const DEV_FORCE_PREMIUM = __DEV__ && true;
