// ════════════════════════════════════════════════════════════════════════
// Motion tokens — SINGLE SOURCE OF TRUTH (timing · easing · spring)
//
// Sibling to design.ts (color / space / type). Adapted from the landed
// Amibroke motion foundation. Nothing downstream hardcodes ms / bezier /
// spring stiffness — read from here.
//
// Principle: motion must GUIDE ATTENTION, COMMUNICATE STATE, or PRESERVE
// SPATIAL CONTINUITY — otherwise remove it. Responsiveness outranks
// smoothness. Reduced-motion overrides everything (the motion/* components
// gate on the OS setting via useReducedMotion / ReduceMotion.System).
//
// Rules:
//   • Durations + easings come from here — no inline ms / bezier in components.
//   • Spring configs come from SPRING — no inline stiffness / damping.
//   • Animate transform / opacity only; never animate layout props (width/top).
// ════════════════════════════════════════════════════════════════════════

import { Easing } from 'react-native-reanimated';
import type { WithSpringConfig } from 'react-native-reanimated';

// ── Durations · milliseconds (Reanimated uses ms) ───────────────────────────
export const DURATION = {
  instant: 80, // tooltip / focus ring / badge
  fast: 180, // button feedback, icon swap, chip toggle
  normal: 350, // modal open, card expand, element enter
  slow: 600, // hero entrance, full-screen transition
  crawl: 1000, // deliberate storytelling — use sparingly
  reveal: 1500, // long, intentional payoff reveals (e.g. a memory resurfacing)
} as const;

// ── Easing curves ───────────────────────────────────────────────────────────
// Plain object (not `as const`): Easing.bezier returns a function, and both
// EasingFunctionFactory and EasingFunction are accepted by withTiming's `easing`.
export const EASING = {
  smooth: Easing.bezier(0.22, 1, 0.36, 1), // ease-out — entrances + count-ups (decelerate into rest)
  sharp: Easing.bezier(0.4, 0, 0.2, 1), // standard in/out
  bounce: Easing.bezier(0.34, 1.56, 0.64, 1), // playful overshoot
  linear: Easing.linear,
};

// ── Travel distances · px (enter/exit translate) ────────────────────────────
export const DISTANCE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 48 } as const;

// ── Scale factors ───────────────────────────────────────────────────────────
// press=0.96 tactile press-in · pop=subtle emphasis · bump=success-confirm pop.
export const SCALE = { subtle: 0.98, press: 0.96, pop: 1.04, bump: 1.2 } as const;

// ── Spring presets · withSpring configs ─────────────────────────────────────
// snappy=default UI · gentle=cards/panels landing · bouncy=playful ·
// instant=popovers · release=drag / overshoot-settle.
export const SPRING = {
  snappy: { stiffness: 300, damping: 30, mass: 1 },
  gentle: { stiffness: 120, damping: 14, mass: 1 },
  bouncy: { stiffness: 400, damping: 10, mass: 1 },
  instant: { stiffness: 600, damping: 35, mass: 1 },
  release: { stiffness: 200, damping: 20, mass: 1 },
} satisfies Record<string, WithSpringConfig>;

export type SpringName = keyof typeof SPRING;

// ── Stagger between sibling entrances · ms (40–80 reads as a cascade) ────────
export const STAGGER_MS = 60;
