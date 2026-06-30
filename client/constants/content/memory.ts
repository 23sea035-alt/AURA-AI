// Memory screen (per-companion remembered facts). Token: {Companion}. The facts
// themselves are demo fixtures (see DEMO.memories); empty/loading/error use SYSTEM.

export const MEMORY = {
  title: 'What {Companion} remembers',
  subline: "You're always in control. Edit or remove anything.",
  empty: "{Companion} hasn't noted anything yet. As you talk, the things that matter will show up here.",
  categories: ['Identity', 'Work', 'Relationship', 'Attribute', 'Preference', 'General'],
  edit: 'Edit',
  delete: 'Delete',
} as const;
