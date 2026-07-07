/* ════════════════════════════════════════════════════════════════════════
   Aura — Design Tokens · SINGLE SOURCE OF TRUTH
   Every scaffold, tab, and screen reads from window.AURA. Change a value
   HERE and it updates everywhere. Nothing downstream hardcodes hex / font /
   spacing. Locked system: "Reading Nook, softened" (Step 1B).
   The surface's emotional job decides its treatment:
     · STRUCTURAL surfaces (dividers, inputs, settings) → crisp warm hairline.
     · INTIMATE surfaces (chat, companion, cards)       → tonal fill + soft
       warm shadow, no hard outline.
   Loaded as a plain <script src="tokens.js"> BEFORE the babel app scripts.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {

  /* ── Type families ──────────────────────────────────────────────────── */
  const FONTS = {
    display: "'Newsreader', Georgia, serif",          // headings / display
    body:    "'Hanken Grotesk', system-ui, sans-serif", // body & UI / chat
  };

  /* ── Spacing · 8pt rhythm (px) ──────────────────────────────────────── */
  const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };

  /* ── Radius · dual system (px / css) ────────────────────────────────── */
  /* structural/editorial: tight, edit · intimate/conversational: soft, card,
     sheet · pill reserved for chips / avatars / small pills only */
  const RADIUS = { tight: 4, edit: 8, soft: 12, card: 16, sheet: 20, pill: 999, full: '50%' };

  /* ── Type scale (role → style object) ───────────────────────────────── */
  const TYPE = {
    display:  { fontFamily: FONTS.display, fontWeight: 600, fontSize: 40, lineHeight: 1.04, letterSpacing: '-0.02em' },
    headline: { fontFamily: FONTS.display, fontWeight: 600, fontSize: 30, lineHeight: 1.12, letterSpacing: '-0.015em' },
    title:    { fontFamily: FONTS.display, fontWeight: 600, fontSize: 22, lineHeight: 1.27 },
    body:     { fontFamily: FONTS.body,    fontWeight: 400, fontSize: 17, lineHeight: 1.64 },
    label:    { fontFamily: FONTS.body,    fontWeight: 600, fontSize: 14, lineHeight: 1.29 },
    caption:  { fontFamily: FONTS.body,    fontWeight: 500, fontSize: 12, lineHeight: 1.33 },
  };

  /* ── Color tokens · warm-light + warm-dark themes ───────────────────── */
  const TOKENS = {
    light: {
      mode: 'light',
      // surfaces
      bg: '#F4ECE0', raised: '#FBF5EB', sheet: '#FFFCF6',
      // text
      textPrimary: '#2A241E', textSecondary: '#6A5D50', textTertiary: '#9C8E7E', textDisabled: '#C2B6A7',
      // accent · Library Wine
      accent: '#8F4150', accentTint: '#F1E2E4', onAccent: '#FFFCF6',
      // structural hairline edges
      border: '#E6DBCB', divider: '#EFE5D6',
      // navpill (floating · uses lift shadow)
      navBg: '#FFFCF6', navBorder: '#E6DBCB', navIdle: '#9C8E7E',
      // intimate surfaces
      bubbleBg: '#EFDFE1', bubbleText: '#5A3942',      // user chat (muted wine tonal fill)
      avatar: '#D8A98C', avatarText: '#5A3B2B',         // companion avatar
      // semantics
      success: '#5C7850', warning: '#B07A22', error: '#B0463A',
      // crisis · grounding green (never alarm-red)
      crisis: '#3D6B5C', crisisBg: '#E7F0EB', crisisText: '#234A40', crisisText2: '#3A5A50',
      // soft warm-shadow elevation (lift moments only)
      e1: '0 1px 2px rgba(60,40,25,0.06)', e2: '0 4px 14px rgba(60,40,25,0.09)', e3: '0 12px 30px rgba(60,40,25,0.14)',
    },
    dark: {
      mode: 'dark',
      // surfaces · warmed charcoal ladder (never pure black)
      bg: '#1B1712', raised: '#25201A', sheet: '#2E2820',
      // text
      textPrimary: '#F1E8DC', textSecondary: '#BFB2A2', textTertiary: '#8A7E70', textDisabled: '#5C5347',
      // accent · Library Wine (lighter for dark; dark text on fill)
      accent: '#CC7A84', accentTint: '#3A2A2E', onAccent: '#1F1712',
      // structural hairline edges
      border: '#393129', divider: '#332C24',
      // navpill
      navBg: '#25201A', navBorder: '#393129', navIdle: '#8A7E70',
      // intimate surfaces
      bubbleBg: '#3A2A2E', bubbleText: '#EAD7DA',
      avatar: '#7A5142', avatarText: '#F4ECDF',
      // semantics
      success: '#8AA47C', warning: '#D7A24E', error: '#D9725F',
      // crisis · grounding green
      crisis: '#6FA08C', crisisBg: '#233A33', crisisText: '#CDE5DB', crisisText2: '#9FC3B5',
      // soft shadow elevation
      e1: '0 1px 2px rgba(0,0,0,0.35)', e2: '0 4px 14px rgba(0,0,0,0.40)', e3: '0 12px 30px rgba(0,0,0,0.50)',
    },
  };

  root.AURA = { FONTS, SPACE, RADIUS, TYPE, TOKENS };

})(typeof window !== 'undefined' ? window : this);
