// ════════════════════════════════════════════════════════════════════════
// Design tokens — SINGLE SOURCE OF TRUTH (warm-light + warm-dark)
//
// Ported verbatim from the locked Claude Design `tokens.js` ("Reading Nook,
// softened" / Step 1B), verified consistent with the Step-1 palette HTML.
// Nothing downstream hardcodes hex / font / spacing — read from here.
//
// RN porting notes (this is React Native, not CSS):
//   • Shadows are RN style objects (shadowColor/Opacity/Radius/Offset + Android
//     elevation), NOT CSS box-shadow strings. shadowColor #3C2819 = rgba(60,40,25).
//   • TYPE.lineHeight is ABSOLUTE px (fontSize × ratio, rounded), not a multiplier.
//   • Font weight is carried by the family NAME (@expo-google-fonts exposes one
//     family per weight); custom RN fonts don't synthesize fontWeight reliably.
//
// The cosmic constants/theme.ts + colors.ts are legacy (still used by un-ported
// screens) and get deleted once every screen reads from here.
// ════════════════════════════════════════════════════════════════════════

import type { ViewStyle } from 'react-native';
import type { PersonaKey } from '@aura/shared';

export type ThemeMode = 'light' | 'dark';

// ── Type families ──────────────────────────────────────────────────────────
// Loaded in app/_layout.tsx (@expo-google-fonts/newsreader + hanken-grotesk)
// before first paint.
export const FONTS = {
  display: {
    regular: 'Newsreader_400Regular',
    medium: 'Newsreader_500Medium',
    semibold: 'Newsreader_600SemiBold',
  },
  body: {
    regular: 'HankenGrotesk_400Regular',
    medium: 'HankenGrotesk_500Medium',
    semibold: 'HankenGrotesk_600SemiBold',
    bold: 'HankenGrotesk_700Bold',
  },
} as const;

// ── Spacing · 8pt rhythm (px) ───────────────────────────────────────────────
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

// ── Radius · dual system (px) ───────────────────────────────────────────────
// structural/editorial: tight, edit · intimate/conversational: soft, card, sheet
// pill (999) reserved for chips / avatars / circles (replaces the web token's '50%').
export const RADIUS = { tight: 4, edit: 8, soft: 12, card: 16, sheet: 20, pill: 999 } as const;

// ── Type scale (role → RN TextStyle) ────────────────────────────────────────
export const TYPE = {
  display: { fontFamily: FONTS.display.semibold, fontSize: 40, lineHeight: 42, letterSpacing: -0.8 },
  headline: { fontFamily: FONTS.display.semibold, fontSize: 30, lineHeight: 34, letterSpacing: -0.45 },
  title: { fontFamily: FONTS.display.semibold, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: FONTS.body.regular, fontSize: 17, lineHeight: 28 },
  label: { fontFamily: FONTS.body.semibold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: FONTS.body.medium, fontSize: 12, lineHeight: 16 },
} as const;

// ── Color tokens ────────────────────────────────────────────────────────────
// The surface's emotional job decides its treatment: STRUCTURAL surfaces use the
// crisp warm hairline (border/divider); INTIMATE surfaces use tonal fill + soft
// warm shadow, no hard outline. `divider` is the faint structural edge (e.g. the
// one-off header bottom border); `border` is the slightly stronger hairline.
export interface ThemeColors {
  bg: string;
  raised: string;
  sheet: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  accent: string;
  accentTint: string;
  onAccent: string;
  border: string;
  divider: string;
  /**
   * Idle interactive-control boundary (unchecked checkbox, unselected radio ring,
   * toggle-off track, idle code cells) — ≥3:1 against bg AND raised in both themes
   * (WCAG 2.2 SC 1.4.11). `border` stays for structural hairlines on
   * non-interactive surfaces.
   */
  outline: string;
  navBg: string;
  navBorder: string;
  navIdle: string;
  bubbleBg: string;
  bubbleText: string;
  avatar: string;
  avatarText: string;
  success: string;
  warning: string;
  error: string;
  crisis: string;
  crisisBg: string;
  crisisText: string;
  crisisText2: string;
}

export const COLORS: Record<ThemeMode, ThemeColors> = {
  light: {
    bg: '#F4ECE0', raised: '#FBF5EB', sheet: '#FFFCF6',
    textPrimary: '#2A241E', textSecondary: '#6A5D50', textTertiary: '#9C8E7E', textDisabled: '#C2B6A7',
    accent: '#8F4150', accentTint: '#F1E2E4', onAccent: '#FFFCF6',
    border: '#E6DBCB', divider: '#EFE5D6', outline: '#8A7B69',
    navBg: '#FFFCF6', navBorder: '#E6DBCB', navIdle: '#9C8E7E',
    bubbleBg: '#EFDFE1', bubbleText: '#5A3942',
    avatar: '#D8A98C', avatarText: '#5A3B2B',
    success: '#5C7850', warning: '#B07A22', error: '#B0463A',
    crisis: '#3D6B5C', crisisBg: '#E7F0EB', crisisText: '#234A40', crisisText2: '#3A5A50',
  },
  dark: {
    bg: '#1B1712', raised: '#25201A', sheet: '#2E2820',
    textPrimary: '#F1E8DC', textSecondary: '#BFB2A2', textTertiary: '#8A7E70', textDisabled: '#5C5347',
    accent: '#CC7A84', accentTint: '#3A2A2E', onAccent: '#1F1712',
    border: '#393129', divider: '#332C24', outline: '#75695A',
    navBg: '#25201A', navBorder: '#393129', navIdle: '#8A7E70',
    bubbleBg: '#3A2A2E', bubbleText: '#EAD7DA',
    avatar: '#7A5142', avatarText: '#F4ECDF',
    success: '#8AA47C', warning: '#D7A24E', error: '#D9725F',
    crisis: '#6FA08C', crisisBg: '#233A33', crisisText: '#CDE5DB', crisisText2: '#9FC3B5',
  },
};

// ── Persona whisper-tones (both themes) ─────────────────────────────────────
// Each companion carries a barely-there wash of its "theme feel" (personas.md:
// Aurora dawn/amber-rose · Orion dusk/deep-clay · Lyra sunlit/honey). `wash` is a
// near-bg surface tint used behind the companion presence and on persona cards —
// atmosphere, not decoration. `deep` is the matching strong tone for large
// decorative marks/rings only (never body text — contrast is not AA-checked for
// small sizes). Custom companions have no tone: fall back to the neutral avatar
// tokens.
// PersonaKey (the 12 curated gallery presets) is owned by @aura/shared; re-exported here so the
// design tokens keyed by it stay in one place.
export type { PersonaKey };

export interface PersonaTone {
  wash: string;
  deep: string;
}

export const PERSONA_TONES: Record<ThemeMode, Record<PersonaKey, PersonaTone>> = {
  light: {
    aurora: { wash: '#F6E8E0', deep: '#9A5B4C' },
    orion: { wash: '#EFE4D8', deep: '#77563E' },
    lyra: { wash: '#F6ECD6', deep: '#8F6D2E' },
    // 9 gallery personas (art-gated) — washes in the same warm-sanctuary family as their duotone.
    sage: { wash: '#EFEBE2', deep: '#6E6450' },
    amara: { wash: '#F8E9E0', deep: '#A85E3F' },
    eli: { wash: '#F3EADD', deep: '#866440' },
    selene: { wash: '#F4E7EA', deep: '#8A5D65' },
    soren: { wash: '#ECE6DC', deep: '#64553F' },
    juno: { wash: '#F9F0D8', deep: '#93701F' },
    thea: { wash: '#F8EDE1', deep: '#A06A42' },
    cyrus: { wash: '#F1E9D6', deep: '#7A5A2A' },
    wren: { wash: '#EBE7DF', deep: '#5F5544' },
  },
  dark: {
    aurora: { wash: '#251C18', deep: '#DBA48F' },
    orion: { wash: '#231C15', deep: '#C89B72' },
    lyra: { wash: '#262013', deep: '#D6B168' },
    sage: { wash: '#201E18', deep: '#C3B79C' },
    amara: { wash: '#271C16', deep: '#DE9E7B' },
    eli: { wash: '#221C14', deep: '#CDA579' },
    selene: { wash: '#241A1C', deep: '#CFA0A8' },
    soren: { wash: '#1F1D17', deep: '#BBA88E' },
    juno: { wash: '#26200F', deep: '#E2BC63' },
    thea: { wash: '#251D15', deep: '#DFAF86' },
    cyrus: { wash: '#221C12', deep: '#CFA45F' },
    wren: { wash: '#1E1C17', deep: '#B7A992' },
  },
};

/** Whisper-tone for a companion id, or null for custom companions (use neutral avatar tokens). */
export function personaToneFor(mode: ThemeMode, id: string): PersonaTone | null {
  const key = id?.toLowerCase?.() as PersonaKey;
  return key in PERSONA_TONES[mode] ? PERSONA_TONES[mode][key] : null;
}

// Per-persona duotone — the avatar for a persona that has no portrait yet, and the color a created
// companion inherits from its base persona. The 3 anchors match their portrait's dominant tones; the
// 9 gallery personas are art-gated, so this branded duotone stands in until a PNG is added to
// portraits.ts (which then takes over). Kept in the warm-sanctuary earth family.
export const PERSONA_COLORS: Record<PersonaKey, { from: string; to: string }> = {
  aurora: { from: '#D8A98C', to: '#C4826B' },
  orion: { from: '#A9683F', to: '#8A5637' },
  lyra: { from: '#D9B26A', to: '#C69A4B' },
  sage: { from: '#B9AC94', to: '#9E9077' },
  amara: { from: '#E2A17C', to: '#CE7E58' },
  eli: { from: '#C9A57E', to: '#B08A62' },
  selene: { from: '#C9A0A6', to: '#AE7E86' },
  soren: { from: '#AE9C88', to: '#918069' },
  juno: { from: '#E6C06A', to: '#D4A44A' },
  thea: { from: '#E3B48C', to: '#CF9468' },
  cyrus: { from: '#BE9455', to: '#A0793D' },
  wren: { from: '#A99C8A', to: '#8C7E6B' },
};

/** The branded duotone for a persona id, or undefined for a truly custom companion. */
export function personaColorsFor(id: string): { from: string; to: string } | undefined {
  return PERSONA_COLORS[id?.toLowerCase?.() as PersonaKey];
}

// ── User monogram tones (theme-independent, curated) ────────────────────────
// The avatar-color picker's palette (edit-profile). Warm, muted, all read with a
// cream initial. Backed by users.avatarColor once the API lands.
export const AVATAR_TONES = [
  '#C77B57', // terracotta
  '#A9683F', // clay
  '#5E7B6A', // moss
  '#7A6CA8', // heather
  '#B58A4A', // honey
  '#6E6E78', // slate
] as const;

/** Cream initial used on every monogram/duotone avatar tone. */
export const AVATAR_INITIAL_COLOR = '#FFFCF6';

// ── Brand mark · app icon (fixed, theme-independent) ────────────────────────
// The abstract app-icon mark is two organic shapes on a cream ground. `wine` and
// `cream` mirror COLORS.light.accent / .bg; `honey` is the mark's smaller second
// form (muted terracotta) and has no theme token — it appears only inside the icon.
export const LOGO_COLORS = {
  wine: '#8F4150',
  honey: '#BD6B45',
  cream: '#F4ECE0',
} as const;

// ── Elevation · soft warm shadow (lift moments only) ────────────────────────
// CSS box-shadow ported to RN. Android `elevation` is an approximate equivalent.
type Elevation = Required<
  Pick<ViewStyle, 'shadowColor' | 'shadowOpacity' | 'shadowRadius' | 'shadowOffset' | 'elevation'>
>;

export interface ThemeShadows {
  e1: Elevation;
  e2: Elevation;
  e3: Elevation;
}

export const SHADOWS: Record<ThemeMode, ThemeShadows> = {
  light: {
    e1: { shadowColor: '#3C2819', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    e2: { shadowColor: '#3C2819', shadowOpacity: 0.09, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    e3: { shadowColor: '#3C2819', shadowOpacity: 0.14, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  },
  dark: {
    e1: { shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    e2: { shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    e3: { shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  },
};
