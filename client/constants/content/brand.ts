// Brand identity strings. ONE source for the app name so any future rename is a
// single edit, not a repo-wide find/replace.
//
// House style: no em dashes in copy. Use a comma or a sentence break instead.

export const BRAND = {
  appName: 'Aura', // Resolved 2026-06-24 (docs/planning/app-name-research.md); formal attorney clearance still recommended pre-launch.
} as const;

/** Resolve the {AppName} token in a copy string to the real brand name. */
export const withAppName = (s: string): string => s.replaceAll('{AppName}', BRAND.appName);
