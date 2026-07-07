# Audit rubric supplement — interaction integrity & visibility (2026-07-03)

> Companion to the doctrine's §13 gate for the full-app fable5-rebuild audit. The §13 gate grades
> *design*; this supplement grades the failure classes the gate under-specifies: modal geometry,
> non-text visibility, scroll/gesture integrity, padding sufficiency, and backend feature coverage.
> Each area cites external grounding (WCAG 2.2 / Apple HIG) so findings are measurable, not vibes.
> Grade each screen S1–S6 alongside §13; same 1–5/N-A scale.

## S1 — Modal & sheet geometry (HIG: Sheets)

Grounding: Apple HIG "Sheets" — a grabber signals resizability; sheet content uses ~16pt container
padding; action buttons ≥44pt tall. Native page-sheets already sit below the status bar.

- **S1a. Content-sized action sheets.** A sheet holding a couple of rows must hug its content
  (`BottomSheet scrollable={false}` / `fitContent`), never open at the 85% default. (Class already
  hit once: memory ••• sheet pre-fix.)
- **S1b. No phantom top padding.** Page-sheet modals (`presentation:'modal'`, e.g. `premium`) must
  NOT re-add `insets.top` — the sheet never reaches the status bar, so safe-area padding there
  reads as dead space. Bottom sheets: grabber → title/content gap should be one `SPACE` step, not
  compounded (grabber zone + sheet padding + content marginTop stacking).
- **S1c. Modal handoff.** Opening a Modal while another dismisses drops it silently on iOS —
  sequential sheets must wait out the exit (`DURATION.normal + 30` pattern) or share one sheet.
- **S1d. In-sheet targets ≥44pt**, dismiss affordances reachable (grabber and/or visible cancel).

## S2 — Non-text visibility (WCAG 2.2 SC 1.4.11, AA)

Grounding: UI-component visual boundaries and meaningful graphics need **≥3:1 contrast against
adjacent colors**; inactive/disabled components are exempt. A border that fails 3:1 is fine *only
if* the component is identifiable without it (e.g. a tonal fill that itself reads ≥3:1, or layout
affordance). Text inside stays under SC 1.4.3 (4.5:1).

- **S2a. Compute, don't eyeball.** For every interactive component whose boundary is a hairline or
  tint (`border`, `divider`, `accentTint` fills, toggle-off track, radio ring, chip outline,
  skeleton), compute the ratio against its background in BOTH themes. Known suspects from the
  palette: `border #E6DBCB` on `bg #F4ECE0` (light) and `#393129` on `#1B1712` (dark) are ~1.1–1.3:1
  — fails as the *sole* affordance.
- **S2b. The user-flagged case:** Home starter chips — hairline-only pill on `bg`; text is readable
  but the *control* is invisible as a control. Fix direction: tonal fill (`raised`/`sheet` +
  shadow e1, like every other tappable card) or a ≥3:1 border, not a bigger font.
- **S2c. Meaningful glyphs** (icons that are the only signifier) ≥3:1; decorative ones exempt.
- **S2d. Not everything needs a box** — static text on `bg` is fine; this is about *interactive*
  components reading as interactive.

## S3 — Scroll & gesture integrity

Grounding: RN `ScrollView` only accepts pan gestures inside its *own* bounds; a viewport that sizes
to its content ("height limited to the number of elements") leaves dead, unswipable screen. Apple
HIG: min touch target 44×44pt.

- **S3a. The under-filled-scroll bug class (pre-approved fix).** Every scrollable screen must keep
  its viewport full-height and its content stretchable:
  `style={{flex:1}}` on the ScrollView + `contentContainerStyle={{flexGrow:1}}`. Grep-check every
  `ScrollView`/`FlatList`; then thumb-test the shortest screens (subscription, notifications,
  voice-preferences, account, safety, sign-in-security) — a swipe anywhere in the content area must
  rubber-band, not dead-drop.
- **S3b. Swipe zones cover the assumed area.** Carousel: the whole slide swipes, not just the art.
  Swipeable rows: actions reachable from the full row height. Sheets: drag-to-dismiss works from
  the sheet body unless it scrolls.
- **S3c. Taps land.** Every visible control actually fires (no inert buttons — class already hit:
  firstchat overflow). `keyboardShouldPersistTaps="handled"` on scrollables containing inputs so a
  tap while the keyboard is up doesn't just dismiss it.
- **S3d. Targets ≥44pt effective** (visual size + hitSlop). Sub-30pt glyph buttons need
  hitSlop/padding to close the gap (class already hit: memory •••).
- **S3e. Navigation gestures.** Pushed screens keep the iOS back-swipe; modals keep swipe-to-
  dismiss unless intentionally gated; nothing traps the user (every screen has a visible exit).

## S4 — Padding sufficiency & rhythm

Grounding: HIG standard content margins (16–20pt) + the doctrine's own 8pt scale (§3, inset 20–24).

- **S4a. Screen inset** = `SPACE.xl` (24) or the established 20; no screen at <16 edge padding.
- **S4b. Card interiors** ≥ `SPACE.lg` (16) for text content; text never touches a card edge.
- **S4c. Bottom clearance:** scroll content ends ≥ `insets.bottom + 110` above the floating tab bar
  (tab screens) or `insets.bottom + SPACE.xl` (pushed screens); nothing clips under the home
  indicator. Top: `insets.top + SPACE` on non-modal roots.
- **S4d. Breathing between sections** — group gaps ≥ `SPACE.lg`; no two unrelated tap targets
  closer than `SPACE.sm`.

## S5 — Backend feature coverage (the wire-seam checklist)

Grounding: the wire seams in `client/lib/backend.ts` + the specs (`docs/specs/`). For each, the UI must
exist AND be reachable:

| Feature | UI + reachable? |
|---|---|
| Recurring `aiDisclosure` chat line (SB 243) | AiNotice on flagged turns |
| `breakReminder` surfacing | chat banner |
| Free-cap limit state (`FREE_DAILY_LIMIT`) | chat limit card + Home counter |
| Memories `GET/PATCH/DELETE` | memory screen list/edit/delete |
| Account soft-delete (30d) + **Reactivate** | manage-data + sign-in offer |
| Data export | manage-data |
| Entitlements refresh **on app foreground** | AppState listener → `refreshEntitlements()` |
| `avatarColor` + `primaryCompanionId` via PUT me | edit-profile picker + pin affordance |
| Home "remembers" card | Home |
| Report message (Apple 1.2) | long-press + overflow |
| Store price placeholder + Restore Purchases + auto-renew line | paywall + subscription |
| Clerk-shaped auth (sign-in/up, SSO, verify-email; no custom reset) | (auth) group |
| Voice: per-companion voice / prefs (voice_id seam) | voice-preferences |
| APNs "companion replied" toggle | notifications |
| UUID-string ids / firstName-lastName profile shape | context types |

Missing/unreachable = must-fix; present but seam-less (no comment mapping to the endpoint) = should.

## S6 — Cross-screen consistency (sweep dimensions)

- Header pattern: pushed one-offs = `TopBar`; onboarding flow = `BackChevron`; tabs = large serif
  title. Flag hybrids.
- One inset per screen family; one sheet padding; Toast for transient, ConfirmSheet for
  destructive; icon sizes from {16,18,20,22,24}; serif only for headings/moments (§4).
- Same state, same skin: tier pills, empty states, skeletons look identical across screens.

## Method notes

- Ratios via WebAIM formula (relative luminance) — computed in the audit script, both themes.
- Every screen captured on the 16e in **both themes** post-relaunch; scrollable screens captured
  scrolled too; suspects thumb-tested via Maestro point-swipes.
- §13 gate still applies; this supplement adds S1–S6 rows to each scorecard.

Sources: [W3C — Understanding SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html) ·
[Eric Eggert — 1.4.11 for UI components in detail](https://yatil.net/blog/non-text-contrast-in-detail-ui-components) ·
[Apple HIG — Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) ·
[Deque — SC 1.4.11 reference](https://dequeuniversity.com/resources/wcag2.1/1.4.11-non-text-contrast)
