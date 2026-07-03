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
    border: '#E6DBCB', divider: '#EFE5D6',
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
    border: '#393129', divider: '#332C24',
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
export type PersonaKey = 'aurora' | 'orion' | 'lyra';

export interface PersonaTone {
  wash: string;
  deep: string;
}

export const PERSONA_TONES: Record<ThemeMode, Record<PersonaKey, PersonaTone>> = {
  light: {
    aurora: { wash: '#F6E8E0', deep: '#9A5B4C' },
    orion: { wash: '#EFE4D8', deep: '#77563E' },
    lyra: { wash: '#F6ECD6', deep: '#8F6D2E' },
  },
  dark: {
    aurora: { wash: '#251C18', deep: '#DBA48F' },
    orion: { wash: '#231C15', deep: '#C89B72' },
    lyra: { wash: '#262013', deep: '#D6B168' },
  },
};

/** Whisper-tone for a companion id, or null for custom companions (use neutral avatar tokens). */
export function personaToneFor(mode: ThemeMode, id: string): PersonaTone | null {
  const key = id?.toLowerCase?.() as PersonaKey;
  return key === 'aurora' || key === 'orion' || key === 'lyra' ? PERSONA_TONES[mode][key] : null;
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
