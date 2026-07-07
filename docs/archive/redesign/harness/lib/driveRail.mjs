// Shared logic for driving a Claude Design prototype through its dev rail.
//
// The prototype is navigable only via in-page React state (no URL routing), exposed through the
// dev rail defined in ../claude-design/dev-harness.jsx. The rail renders, in fixed order:
//   select.dev-jump          → screen jumper
//   .dev-seg (index 0)       → Theme    [light, dark]
//   .dev-seg (index 1)       → Account  [free, premium]
//   .dev-seg (index 2)       → Data state [happy, empty, loading, error]
//   .dev-seg (index 3)       → per-screen state  (only when the screen declares `states`)
//   .dev-seg (last)          → Companion model   (only when the screen declares `companions`)
// We target sections by this stable index rather than by header text (labels are dynamic), and
// clip screenshots to `.dev-scaler` (the scaled 402x874 device) to exclude the dark rail.

const SECTION = { theme: 0, account: 1, dataState: 2, screenState: 3 };

export const FRAME = '.dev-scaler';

/** Open an artifact and wait until React has mounted the device frame and fonts are ready. */
export async function openArtifact(page, baseUrl, file) {
  await page.goto(`${baseUrl}/${file}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('select.dev-jump', { timeout: 20000 });
  await page.waitForSelector(FRAME, { state: 'visible', timeout: 20000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
}

/** Click the chip with exact `value` inside the rail section at `sectionIndex`. No-op-safe. */
async function clickChip(page, sectionIndex, value) {
  const seg = page.locator('.dev-rail .dev-seg').nth(sectionIndex);
  const chip = seg.getByRole('button', { name: value, exact: true });
  if ((await chip.count()) === 0) {
    throw new Error(`chip "${value}" not found in rail section ${sectionIndex}`);
  }
  await chip.click();
}

export async function setTheme(page, theme) {
  await clickChip(page, SECTION.theme, theme);
}

export async function selectScreen(page, screenId) {
  // Changing the screen resets the per-screen state to that screen's first declared state
  // and re-renders the state section, so always select the screen before setting its state.
  await page.selectOption('select.dev-jump', screenId);
}

export async function setScreenState(page, state) {
  if (state == null) return;
  await clickChip(page, SECTION.screenState, state);
}

/**
 * Navigate to a specific (screen, state, theme) and let entrance animations + fonts settle.
 * `settleMs` is the post-navigation pause before the caller screenshots.
 */
export async function gotoScreen(page, { screen, state, theme }, { settleMs = 900 } = {}) {
  // Set theme BEFORE selecting the screen: some screens autofocus a field on mount, and a
  // later rail click (theme chip) would blur it — which, on the profile screen, fires its
  // "touched" validation and shows a false error. Selecting the screen last keeps autofocus intact.
  if (theme) await setTheme(page, theme);
  await selectScreen(page, screen);
  await setScreenState(page, state);
  await page.waitForTimeout(settleMs);
}

/** Attach error collectors; returns a function that yields the collected problems. */
export function watchErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = new Set();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('requestfailed', (r) => failedRequests.push(`${r.url()} (${r.failure()?.errorText})`));
  page.on('response', (r) => { if (r.status() >= 400) badResponses.add(`${r.status()} ${r.url()}`); });
  return () => ({ consoleErrors, pageErrors, failedRequests, badResponses: [...badResponses] });
}
