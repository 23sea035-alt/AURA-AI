// Memory screen (per-companion remembered facts). Token: {Companion}. The facts
// themselves are demo fixtures (see DEMO.memories); empty/loading/error use SYSTEM.

export const MEMORY = {
  title: 'What {Companion} remembers',
  subline: "You're always in control. Swipe or tap ••• on any memory to edit or remove it.",
  empty: "{Companion} hasn't noted anything yet. As you talk, the things that matter will show up here.",
  emptyTitle: 'Nothing noted yet',
  categories: ['Identity', 'Work', 'Relationship', 'Attribute', 'Preference', 'General'],
  edit: 'Edit',
  delete: 'Delete',
  // grace copy for the delete confirm — never final-sounding, always reversible-by-implication.
  deleteConfirm: {
    title: 'Remove this memory?',
    body: '{Companion} will forget this. You can always share it again later.',
    confirmLabel: 'Remove',
    cancelLabel: 'Keep it',
  },
} as const;
