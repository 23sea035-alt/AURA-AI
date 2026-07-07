// Companions tab (roster + chat list), the companion create/customize screen, and the roster
// lifecycle chrome (at-limit sheets, Select mode, delete confirms, archived-chat bar).
// Voice lines + trait axes come from ./personas; caps come from @aura/shared (spec §2).
// No companion is ever "locked" — the free/premium gate is partial (tuning + look only).

export const COMPANIONS = {
  title: 'Companions',
  createFab: 'New companion', // FAB accessibility label (create is a first-class free action)

  // Swipe actions (left-swipe reveals Pin/Unpin, right-swipe reveals Archive) + long-press
  // action sheet (Edit/Pin/Archive) — same three actions, two entry points.
  swipe: { pin: 'Pin', unpin: 'Unpin', archive: 'Archive' },
  actionSheet: { edit: 'Edit companion' },
  undoArchived: '{Companion} archived', // paired with an Undo action, ~4-5s dwell
  undoAction: 'Undo',

  // Active / Archived subtabs + search over the roster (search filters within the selected tab).
  search: 'Search companions',
  noResults: 'No companions match “{query}”.',
  subtabs: ['active', 'archived'] as const, // Segmented capitalizes these for display
  archivedSection: { label: 'Archived', empty: 'No archived companions yet', restore: 'Restore' },

  // Select mode (multi-select archive/restore/delete) — header "Select" text control, contextual
  // action bar replaces the tab bar, actions depend on the subtab (spec §12).
  select: {
    enter: 'Select',
    done: 'Done',
    selectedTemplate: '{n} selected',
    archive: 'Archive',
    unarchive: 'Unarchive',
    delete: 'Delete',
    baseDeleteHint: 'Base companions can be archived, not deleted.',
    lastActiveHint: 'You need at least one active companion.',
    // Batch unarchive honors the active cap: fills the remaining slots and says so (spec §6).
    restoredPartialTemplate: 'Restored {restored}. You’re at your {cap} limit, archive more to bring the others back.',
  },

  // Delete is permanent and names what's lost (spec §6). Archive stays the reversible default.
  deleteConfirm: {
    titleTemplate: 'Delete {Companion}?',
    title: 'Delete companions?',
    body: 'This removes your conversation and memories with them. This can’t be undone.',
    bodyBatchTemplate: 'This removes your conversations and memories with {n} companions. This can’t be undone.',
    confirm: 'Delete',
    cancel: 'Cancel',
  },

  // The two at-limit cases, distinct and never a paywall redirect (spec §4). {cap} is filled from
  // the caller's tier caps in @aura/shared.
  limitSheet: {
    activeFull: {
      titleTemplate: 'You’re at {cap} companions',
      bodyFree: 'Archive one to make room, or go Premium for more.',
      bodyPremium: 'Archive one to make room.',
      // §13 downgrade soft-lock, shown when actives sit OVER the cap: nothing is lost or removed.
      overCapNote: 'Everyone here stays yours and stays usable. New slots open when you archive.',
      archiveCta: 'Archive a companion',
    },
    totalFull: {
      titleTemplate: 'You’ve reached your total of {cap} companions',
      bodyFree: 'Delete some archived ones to make room, or go Premium for a higher limit.',
      bodyPremium: 'Delete some archived ones to make room.',
      manageCta: 'Manage archived',
    },
    premiumCta: 'Go Premium',
  },

  // Archived-chat composer replacement: reading is always free, only re-activating is gated (§8).
  archivedBar: {
    notice: 'This chat is archived',
    cta: 'Unarchive',
  },
} as const;

export const CREATE = {
  saveCta: 'Save companion', // the free CTA too — never "Unlock with Premium" (partial gate, §4)
  changeLook: 'Change look',
  premiumBadge: 'Premium', // small affordance on the gated trait grid + look badge
  premiumExplainer: 'Personality tuning and looks come with Premium.',
  counterTemplate: '{index} / {count}', // carousel position cue ("3 / 12")
  traitLabels: { warmth: 'Warmth', energy: 'Energy', verbosity: 'Verbosity' }, // segments from TRAITS
  autoNumberExample: 'Aurora 2', // a second Aurora auto-numbers
  // live voice preview restates the selected chips. Aurora's default-tune example:
  voicePreviewExample: 'Doting · calm · balanced. Warm, gentle, emotionally attuned.',
} as const;
