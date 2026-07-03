---
name: audit-screen
description: Design-audit a single Aura app screen (or sweep several) against the Warm Sanctuary design doctrine (docs/redesign/01-doctrine.md). Invoked as /audit-screen <name> (e.g. /audit-screen home) or /audit-screen --sweep <a> <b> … for cross-screen consistency. Drives to the screen itself via /verify-ui's tooling, screenshots the iPhone 16e simulator in both themes, grades the doctrine's §13 gate as a rubric, and returns a prioritized, severity-tagged critique with concrete fixes citing tokens + line numbers. Recommend-only — never implements until approved.
---

# Audit Screen

Grade one screen's design against the **design doctrine**
([`docs/redesign/01-doctrine.md`](../../../docs/redesign/01-doctrine.md)) and return a rubric
scorecard + a prioritized, severity-tagged critique with concrete fixes. Invoked as
`/audit-screen <name>` — e.g. `/audit-screen home`, `/audit-screen create`. Add
`--sweep <a> <b> …` to compare several screens for cross-screen drift (see **Sweep mode**).

**The doctrine is the single source of truth.** This skill is a *grader*, not a rulebook: cite the
doctrine section a finding violates (e.g. "§2 — hardcoded hex instead of `COLORS.accentTint`")
rather than restating rules. The doctrine's **§13 gate is this skill's rubric** — they stay in sync
by design. Ported from `../Amibroke`'s own `audit-screen` skill; adapted to Aura's `useTheme()`
dual light/dark system, expo-router file layout, and the `/verify-ui` sim tooling this repo
already has (Amibroke drives its sim manually — Aura doesn't have to).

**Not the same job as the remediation plan.** `docs/redesign/rn-port-fidelity-audit.md` +
`rn-port-remediation-plan.md` are a one-time, dated backlog diffing the RN port against the locked
Claude-Design HTML/JSX prototypes — that's a punch-list being worked off in batches, not a standing
gate. This skill grades a screen directly against **doctrine §13** instead, with no prototype
required — useful for screens that never had one, and for regression-checking a screen after its
remediation batch has already landed. Don't duplicate the prototype-diff here; if a screen still
has an open remediation-plan item, say so and point at the plan rather than re-deriving it.

## Owner defaults (decided — do not re-ask each run)

1. **Audit & recommend ONLY.** Produce findings + STOP. Implement nothing until the user explicitly
   approves; they hash it out conceptually first.
2. **Capture:** drive there yourself — this repo has `/verify-ui`'s tooling for exactly this,
   unlike a manual-only setup. Use a throwaway signup
   (`client/scripts/ui-probe/flows/signup-throwaway.yaml`) to reach post-auth screens; don't wait
   for the user to navigate unless the screen depends on session state you can't easily reproduce
   (an existing chat history, a specific subscription tier, etc.) — ask in that case.
3. **Device:** iPhone 16e simulator — the daily design driver, tightest common constraints.
4. **Relaunch before capturing** (see [[aura-verify-ui-skill]] / `/verify-ui` owner default #5):
   Metro fast-refresh can silently go stale. A full `simctl terminate` + `simctl launch` before
   screenshotting is cheap insurance against grading a screen that isn't actually current.
5. **Restraint is a rule, not a gap** (doctrine §0/§13 item 10): propose "make it stand out"
   additions only when a screen feels flat *for its importance*. Leave utility screens (Settings,
   legal, Help/FAQ) calm. Don't ding a clean utility screen for lacking motion.

## Step 1 — Locate the screen

Aura uses expo-router file-based routing under `client/app/`. Map the arg fuzzily:

| name | file |
|---|---|
| `welcome` | `app/welcome.tsx` |
| `login` | `app/(auth)/login.tsx` |
| `register` / `signup` | `app/(auth)/register.tsx` |
| `forgot-password` | `app/(auth)/forgot-password.tsx` |
| `onboarding` / `carousel` | `app/onboarding.tsx` |
| `age-verification` / `age-gate` | `app/age-verification.tsx` |
| `ai-disclosure` / `disclosure` | `app/ai-disclosure.tsx` |
| `profile` (onboarding step) | `app/profile.tsx` |
| `persona` | `app/persona.tsx` |
| `firstchat` | `app/firstchat.tsx` |
| `home` | `app/(tabs)/index.tsx` |
| `companions` | `app/(tabs)/companions.tsx` |
| `you` | `app/(tabs)/you.tsx` |
| `premium` | `app/(tabs)/premium.tsx` |
| `chat` | `app/chat/[id].tsx` |
| `create` | `app/companion/create.tsx` |
| `edit-profile` | `app/edit-profile.tsx` |
| `account` | `app/account.tsx` |
| `sign-in-security` | `app/sign-in-security.tsx` |
| `subscription` | `app/subscription.tsx` |
| `notifications` | `app/notifications.tsx` |
| `help` | `app/help.tsx` |
| `safety` | `app/safety.tsx` |
| `privacy` | `app/privacy.tsx` |
| `memory` / `long-term-memory` | `app/long-term-memory.tsx` |
| `rate-app` | `app/rate-app.tsx` |
| `voice-call` | `app/voice-call.tsx` |
| `voice-preferences` | `app/voice-preferences.tsx` |

If ambiguous/missing, list candidates from `client/app/` and ask. Read the whole file (and any
`components/` it composes) — note components, styles, data sources, navigation.

## Step 2 — Load the doctrine + tokens (what you grade against)

Read [`docs/redesign/01-doctrine.md`](../../../docs/redesign/01-doctrine.md) (the spec) and
`client/constants/design.ts` + `client/constants/motion.ts` (the exact token names/values — both
are self-described "single source of truth"; nothing hardcoded should exist downstream). Cite
tokens + the screen's line numbers in every finding.

**Token groups to check against** (grep the screen for anything that should have come from these
instead of a literal):
- `design.ts` — `COLORS` (per-theme; see contrast reference below), `SPACE` (8pt scale), `RADIUS`
  (dual system — tight/structural vs soft/intimate vs sheet/pill), `TYPE`/`FONTS` (Newsreader
  display + Hanken Grotesk body), `SHADOWS` (e1/e2/e3 soft warm — never a glow).
- `motion.ts` — `DURATION`, `EASING`, `SPRING`, `DISTANCE`, `SCALE`, `STAGGER_MS`.

**Contrast quick-reference** (verify against `design.ts` — exact hex is theme-dependent):
- `textPrimary` — strong. Anything important.
- `textSecondary` — readable but subordinate. Support text.
- `textTertiary` / `textDisabled` — low-emphasis; **fine-print only**. Flag any *primary*
  label/body/placeholder using them.
- `accent` / `accentTint` / `onAccent` — the **one** signature warm accent. Flag any hardcoded hex
  standing in for it, and any *second* decorative accent color.
- Crisis/support surfaces read as **supportive, not alarm** (doctrine §1/§10) — flag alarm-red
  treatments.

## Step 3 — Capture on the 16e

**Deep-link stacking guardrail (learned 2026-07-03).** When batch-capturing via URL-scheme deep
links (`xcrun simctl openurl booted "aura-ai://…"`), every link PUSHES onto the existing stack. If
a modal route (`premium`) is open — or dozens of screens have piled up — subsequent screens render
inside the modal's sheet chrome (rounded card + gray band up top; looks like "everything became a
modal") and back-navigation follows the garbage stack, not real user paths. Neither is an app bug.
Rules: capture modal routes LAST in a batch; `simctl terminate` + `launch` between batches (cheap
stack reset); and never grade presentation or back-behavior from a deep-linked stack — walk the
real navigation path for those.

Reach the screen (Owner default #2), relaunch (#4), then:

```bash
xcrun simctl io booted screenshot /tmp/audit-<name>-light.png
```

Then Read the PNG. Beyond a single shot:

- **Both themes, always** (doctrine §13 gate item 11): `xcrun simctl ui booted appearance dark`,
  re-screenshot, then set back to `light` when done. Don't skip dark — token misuse often only
  shows up there (a hardcoded hex that happened to look fine in light).
- **Animated screens:** use `/verify-ui`'s tooling — `record.sh` then `contact_sheet.py` for a fast
  multi-frame pass — rather than eyeballing a couple of manually-timed screenshots. Judge against
  §5 (tokens not inline literals, reduce-motion fallback).
- **Scrollable screens** (Settings-style lists, long forms, Help/FAQ): don't grade only the first
  viewport. `maestro test client/scripts/ui-probe/flows/scroll-down.yaml` (repeat, screenshotting
  between swipes) to cover the whole scroll. Confirm content clears the tab bar / safe areas
  (§11) and nothing clips at the bottom.
- **Non-scroll screens:** verify everything fits with no clipping (usual victims pushed off-bottom:
  disclaimers, secondary CTAs, footer links).

## Step 4 — Grade the rubric (= the doctrine §13 gate)

Score each dimension **1–5** (or **N/A**) with a one-line justification. Each maps to a doctrine
section — cite it. Lead with the lowest scores / highest-impact issues.

| # | Dimension (doctrine §) | What to check |
|---|---|---|
| 1 | **Brand & color** (§1) | one warm accent, accent-agnostic, semantics semantic-only, crisis = supportive not alarm, warm-dark (not pure black), gradients/texture earned only |
| 2 | **Surface depth & color usage** (§2) | text hierarchy (`textPrimary`/`Secondary`/`Tertiary`/`Disabled`), surface job decides fill-vs-hairline (never both), no hardcoded hex/rgba |
| 3 | **Spacing & rhythm** (§3) | `SPACE` 8pt scale, consistent insets, dual `RADIUS` applied by surface job |
| 4 | **Typography** (§4) | from `TYPE`/`FONTS`, no invented sizes, relaxed line-height/measure for chat/long-form |
| 5 | **Motion & alive** (§5) | `DURATION`/`EASING`/`SPRING` not inline literals, **reduce-motion** snap-to-final fallback, typing-reveal calm |
| 6 | **Icons** (§6) | one committed family, consistent sizes, **no accent-tinted icon tiles** |
| 7 | **Reuse** (§7) | canonical primitives (Avatar, bubble, input dock, Card, Button, ListGroup/ListRow, segmented control, chip, Toggle, Empty/Loading/Error states) not bespoke look-alikes |
| 8 | **Hierarchy & UX** (§8) | one focal element per screen, touch targets ≥44pt, AI-honesty cue present but unobtrusive |
| 9 | **Interaction & feedback** (§9) | Toast/Alert/inline channel matches the moment, disabled/loading/pressed states, destructive confirm, sheet-vs-push, keyboard handling |
| 10 | **Content, safety & honesty** (§10) | AI disclosure tone, crisis support (988/741741, never alarm-red), low-friction report flow, microcopy casing, degenerate-data + loading/empty/error/happy states |
| 11 | **Accessibility** (§11, WCAG 2.2 AA) | contrast minimums, Dynamic Type, VoiceOver labels (esp. icon-only), reduce motion, safe-area clearance |
| 12 | **Performance** (§12) | `FlatList`/virtualized long lists, no always-on heavy motion |
| 13 | **Anti-vibe-code & identity** (§0, gate item 10) | run the §0 "vibe-coded tell → Warm Sanctuary equivalent" table pass/fail; ≥1 positive identity anchor present; not too basic for its importance |

Mark **N/A** honestly (a static legal screen has no Motion/Performance surface). Don't pad scores.

## Step 5 — Deliver, then STOP

1. **Scorecard** — the rubric table with each dimension's 1–5/N-A + a one-line note.
2. **Prioritized findings** (highest impact first). Each: **severity** (`must-fix` / `should` /
   `polish`) · doctrine **§** · **token + line** · a concrete **before → after** fix.
3. A short **recommended fix-set** (often a subset worth doing first).
4. If the screen has an open item in `rn-port-remediation-plan.md`, note it and point there instead
   of re-describing the same gap as a "new" finding.
5. Do **not** edit anything. Wait for the user to pick what to implement.

## Sweep mode — `/audit-screen --sweep <a> <b> …`

Cross-screen drift is where vibe-code creeps in. Capture each named screen (both themes), then
compare them on the consistency-sensitive dimensions: **spacing rhythm, icon family/sizes, radius
usage by surface job, motion patterns, feedback channel (Toast vs Alert), component reuse, header
pattern**. Output a small matrix (screen × dimension) flagging divergences, and recommend the
**canonical** choice for each (citing the doctrine section). Same recommend-only rule — STOP after.

## After approval (only when the user says go)

- Implement the agreed changes (often a discussed subset). **Follow the doctrine** — it's the
  standing rule for all UI work.
- `cd client && npx tsc --noEmit -p .` (fastest correctness signal here).
- Relaunch, then re-capture on the 16e to verify — both themes, multiple frames for any motion,
  confirm no new clipping. Report what you saw.
- Don't commit or push unless asked; follow the repo's commit conventions.

## Guardrails

- Screenshotting + reading UI is safe; don't submit a real analysis/chat call or trigger any paid
  API path while reaching a screen — a throwaway signup is fine, running up real usage isn't.
- Doctrine: `docs/redesign/01-doctrine.md` · tokens: `client/constants/design.ts` +
  `client/constants/motion.ts` · routes: `client/app/` (expo-router) · components:
  `client/components/` · content copy: `client/constants/content/*`.
- If you can't tell whether a gap is a genuine doctrine violation or an intentional Keep (see the
  Pre-tagged KEEP list in `rn-port-remediation-plan.md`), flag it as **Discuss**, not must-fix.
