// Record a webm walkthrough of a flow for review. Drives the dev rail with natural,
// varied pacing (ui-demo style) so transitions read at a human speed.
//
// NOTE (v1): the dev rail is visible in frame — this is an internal review reel, not a
// marketing clip. A cleaner rail-hidden, in-frame-navigation version is a planned enhancement.
//
// Usage: node clip.mjs [artifact]      (currently defines the "onboarding" flow)

import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startServer } from './lib/server.mjs';
import { ARTIFACTS } from './matrix.mjs';
import { openArtifact, selectScreen, setScreenState, setTheme, watchErrors } from './lib/driveRail.mjs';

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const artifact = process.argv[2] || 'onboarding';
const art = ARTIFACTS[artifact];
if (!art) throw new Error(`Unknown artifact: ${artifact}`);

// Narrative walk-throughs per artifact. hold = ms to linger after arriving.
const FLOWS = {
  onboarding: [
    { screen: 'welcome', hold: 1600 },
    { screen: 'auth', state: 'signup', hold: 1500 },
    { screen: 'carousel', state: 'slide1', hold: 1300 },
    { screen: 'carousel', state: 'slide2', hold: 1300 },
    { screen: 'carousel', state: 'slide3', hold: 1300 },
    { screen: 'agegate', state: 'default', hold: 1300 },
    { screen: 'disclosure', hold: 1500 },
    { screen: 'profile', hold: 1400 },
    { screen: 'persona', hold: 1700 },
    { screen: 'conversation', state: 'default', hold: 1600 },
    { screen: 'conversation', state: 'typing', hold: 1600 },
  ],
};
const flow = FLOWS[artifact];
if (!flow) throw new Error(`No flow defined for "${artifact}" yet.`);

const theme = process.argv[3] || 'light';
const clipsDir = path.join(HARNESS_DIR, 'captures', artifact, 'clips');
const videoDir = path.join(clipsDir, '.tmp');
await mkdir(clipsDir, { recursive: true });

const { url, close } = await startServer();
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 1040 },
  recordVideo: { dir: videoDir, size: { width: 1280, height: 1040 } },
});
const page = await context.newPage();
const getErrors = watchErrors(page);

try {
  await openArtifact(page, url, art.file);
  await setTheme(page, theme);
  console.log(`Recording "${artifact}" flow (${flow.length} steps, ${theme})`);
  for (const step of flow) {
    await selectScreen(page, step.screen);
    if (step.state) await setScreenState(page, step.state);
    await page.waitForTimeout(step.hold);
  }
} catch (err) {
  console.error('Clip threw:', err.message);
  process.exitCode = 1;
} finally {
  const { pageErrors } = getErrors();
  if (pageErrors.length) console.log(`page errors: ${pageErrors.slice(0, 4).join(' | ')}`);
  const target = path.join(clipsDir, `${artifact}.webm`);
  const video = page.video();
  // Close the context FIRST so the video is finalized, THEN save it. (saveAs() called before
  // close() blocks waiting for the page to close — which would deadlock here.)
  await context.close();
  await video?.saveAs(target).catch((e) => console.error('saveAs failed:', e.message));
  await rm(videoDir, { recursive: true, force: true }).catch(() => {});
  await browser.close();
  await close();
  console.log(`Clip → captures/${artifact}/clips/${artifact}.webm`);
}
