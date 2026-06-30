// Single source of truth for user-facing copy. Import via `@/constants/content`.
//
// One domain per file (modeled on ../Amibroke/src/config/*): typed `as const`,
// no em dashes in copy, TODO markers on launch-critical values. Shared strings live
// once (brand / system / personas / safety / chat); screen files hold only their own
// copy and reference the shared modules. Demo fixtures are separate: @/constants/demo.
//
// This module is the source of truth — the redesign decks in docs/redesign/screens/*
// are design-only and no longer carry canonical copy.

export * from './brand';
export * from './system';
export * from './personas';
export * from './safety';
export * from './chat';
export * from './onboarding';
export * from './home';
export * from './companions';
export * from './account';
export * from './paywall';
export * from './memory';
export * from './support';
