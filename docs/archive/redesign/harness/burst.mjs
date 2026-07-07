// Rapid burst-screenshot tool for verifying animation/motion landed.
// Captures an ordered strip of frames during a screen's entrance or a state→state transition,
// so motion can be checked frame-by-frame (the prototype's CSS animations are not deterministic,
// so we time-sample rather than frame-lock).
//
// Usage:
//   node burst.mjs <artifact> <screen> [--to=state] [--from=state] [--theme=light|dark]
//                  [--frames=N] [--interval=ms]
// Examples:
//   node burst.mjs onboarding carousel              # slide1 → slide2 transition
//   node burst.mjs onboarding welcome               # entrance (jump in from another screen)
//   node burst.mjs onboarding conversation --to=typing

import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startServer } from './lib/server.mjs';
import { ARTIFACTS } from './matrix.mjs';
import { openArtifact, selectScreen, setTheme, setScreenState, watchErrors, FRAME } from './lib/driveRail.mjs';

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const pos = [];
  const opts = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
    else pos.push(a);
  }
  return { artifact: pos[0] || 'onboarding', screen: pos[1], opts };
}

const { artifact, screen: screenId, opts } = parseArgs(process.argv.slice(2));
const art = ARTIFACTS[artifact];
if (!art) throw new Error(`Unknown artifact: ${artifact}`);
const screen = art.screens.find((s) => s.id === screenId);
if (!screen) throw new Error(`Unknown screen "${screenId}" in ${artifact}. Options: ${art.screens.map((s) => s.id).join(', ')}`);

const theme = opts.theme || 'light';
const frames = Number(opts.frames) || 14;
const interval = Number(opts.interval) || 80;

// Decide mode: a state→state transition if the screen has ≥2 states, else an entrance (jump-in).
const states = screen.states;
const isTransition = states.length >= 2;
const fromState = opts.from || (isTransition ? states[0] : null);
const toState = opts.to || (isTransition ? states[1] : null);
const tag = isTransition ? `${fromState}-to-${toState}` : 'entrance';
const burstDir = path.join(HARNESS_DIR, 'captures', artifact, 'bursts', `${screenId}-${tag}`);

const { url, close } = await startServer();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 1040 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const getErrors = watchErrors(page);

try {
  await rm(burstDir, { recursive: true, force: true });
  await mkdir(burstDir, { recursive: true });
  await openArtifact(page, url, art.file);
  await setTheme(page, theme);
  const frame = page.locator(FRAME);

  if (isTransition) {
    // Settle on the starting state, then flip to the target and burst through the transition.
    await selectScreen(page, screenId);
    await setScreenState(page, fromState);
    await page.waitForTimeout(900);
    console.log(`Bursting ${artifact}/${screenId}: ${fromState} → ${toState} (${frames} frames @ ${interval}ms, ${theme})`);
    await setScreenState(page, toState); // trigger
  } else {
    // Park on a different screen, then jump to the target so its entrance animation replays.
    const other = art.screens.find((s) => s.id !== screenId)?.id;
    await selectScreen(page, other);
    await page.waitForTimeout(700);
    console.log(`Bursting ${artifact}/${screenId}: entrance (${frames} frames @ ${interval}ms, ${theme})`);
    await selectScreen(page, screenId); // trigger mount
  }

  for (let i = 0; i < frames; i++) {
    await frame.screenshot({ path: path.join(burstDir, `frame_${String(i).padStart(3, '0')}.png`) });
    await page.waitForTimeout(interval);
  }
  process.stdout.write('.'.repeat(frames) + '\n');
  console.log(`Frames → captures/${artifact}/bursts/${screenId}-${tag}/`);
} catch (err) {
  console.error('Burst threw:', err.message);
  process.exitCode = 1;
} finally {
  const { pageErrors, badResponses } = getErrors();
  if (pageErrors.length) console.log(`page errors: ${pageErrors.slice(0, 4).join(' | ')}`);
  if (badResponses.length) console.log(`non-OK responses: ${badResponses.slice(0, 6).join(' | ')}`);
  await browser.close();
  await close();
}
