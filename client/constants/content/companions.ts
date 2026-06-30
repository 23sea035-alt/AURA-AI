// Companions tab (roster + chat list) and the companion create/customize screen.
// Voice lines + trait axes come from ./personas; previews/last-message are demo.

export const COMPANIONS = {
  title: 'Companions',
  lockedCreate: 'Create your own companion · Premium', // free upsell row → Paywall
  lockedCompanion: 'Included with Premium', // non-default companion on free: locked, never deleted
  // roster card: avatar + name + PERSONAS[x].voice + last-message preview (demo) + time-ago (demo)
} as const;

export const CREATE = {
  saveCta: 'Save companion',
  unlockCta: 'Unlock with Premium',
  changeLook: 'Change look',
  traitLabels: { warmth: 'Warmth', energy: 'Energy', verbosity: 'Verbosity' }, // segments from TRAITS
  autoNumberExample: 'Aurora 2', // a second Aurora auto-numbers
  // live voice preview restates the selected chips. Aurora's default-tune example:
  voicePreviewExample: 'Affectionate · calm · balanced. Warm, gentle, emotionally attuned.',
  // NOTE: the deck wrote "affectionate · balanced · balanced"; corrected to personas.md
  // canon (affectionate · calm · balanced). See docs/specs/personas.md.
} as const;
