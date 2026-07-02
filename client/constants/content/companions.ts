// Companions tab (roster + chat list) and the companion create/customize screen.
// Voice lines + trait axes come from ./personas; previews/last-message are demo.

export const COMPANIONS = {
  title: 'Companions',
  lockedCreate: 'Create your own companion · Premium', // free upsell row → Paywall
  lockedCompanion: 'Included with Premium', // non-default companion on free: locked, never deleted
  // roster card: avatar + name + PERSONAS[x].voice + last-message preview (demo) + time-ago (demo)

  // Swipe actions (left-swipe reveals Pin/Unpin, right-swipe reveals Archive) + long-press
  // action sheet (Edit/Pin/Archive) — same three actions, two entry points.
  swipe: { pin: 'Pin', unpin: 'Unpin', archive: 'Archive' },
  actionSheet: { edit: 'Edit companion' },
  archiveGuard: "You need at least one companion — unarchive one before removing this.",
  undoArchived: '{Companion} archived', // paired with an Undo action, ~4-5s dwell
  undoAction: 'Undo',

  // Active / Archived subtabs + search over the roster (search filters within the selected tab).
  search: 'Search companions',
  noResults: 'No companions match “{query}”.',
  subtabs: ['active', 'archived'] as const, // Segmented capitalizes these for display
  archivedSection: { label: 'Archived', empty: 'No archived companions yet', restore: 'Restore' },
} as const;

export const CREATE = {
  saveCta: 'Save companion',
  unlockCta: 'Unlock with Premium',
  unlockExplainer: 'Tuning & looks are a Premium feature.', // explainer line above the free Unlock door
  changeLook: 'Change look',
  traitLabels: { warmth: 'Warmth', energy: 'Energy', verbosity: 'Verbosity' }, // segments from TRAITS
  autoNumberExample: 'Aurora 2', // a second Aurora auto-numbers
  // live voice preview restates the selected chips. Aurora's default-tune example:
  voicePreviewExample: 'Affectionate · calm · balanced. Warm, gentle, emotionally attuned.',
  // NOTE: the deck wrote "affectionate · balanced · balanced"; corrected to personas.md
  // canon (affectionate · calm · balanced). See docs/specs/personas.md.
} as const;
