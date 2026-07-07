// Phase 0 de-risk: prove the toolchain end-to-end before building the full harness.
// Serves the prototypes, opens Onboarding.html in Chromium, confirms it actually renders
// (CDN React/Babel + Google Fonts reachable), that the dev rail is present, and that a clean
// `.dev-scaler` clip of the 402x874 device frame can be captured.
//
// Usage: node smoke.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startServer } from './lib/server.mjs';

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HARNESS_DIR, 'captures', '_smoke');

const { url, close } = await startServer();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 1040 }, deviceScaleFactor: 2 });
const page = await context.newPage();

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('requestfailed', (r) => failedRequests.push(`${r.url()} (${r.failure()?.errorText})`));

let ok = true;
try {
  await mkdir(OUT_DIR, { recursive: true });
  const target = `${url}/Onboarding.html`;
  console.log(`→ Opening ${target}`);
  await page.goto(target, { waitUntil: 'load', timeout: 30000 });

  // The dev rail (raw DOM) appears as soon as the harness script runs; the device frame
  // (.dev-scaler) appears only after Babel transpiles + React mounts. Wait for both.
  await page.waitForSelector('select.dev-jump', { timeout: 20000 });
  console.log('✓ Dev rail present (harness scripts ran)');
  await page.waitForSelector('.dev-scaler', { state: 'visible', timeout: 20000 });
  console.log('✓ Device frame mounted (React rendered)');

  // Let webfonts + entrance animations settle.
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(1500);

  // Sanity: the frame should have real content, not an empty box.
  const frame = page.locator('.dev-scaler');
  const box = await frame.boundingBox();
  console.log(`  frame box: ${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'none'}`);
  const textLen = (await frame.innerText().catch(() => '')).trim().length;
  if (!box || box.width < 300 || textLen < 5) {
    ok = false;
    console.log('✗ Frame looks empty/too small — prototype likely did not render.');
  }

  await frame.screenshot({ path: path.join(OUT_DIR, 'welcome.png') });
  console.log(`✓ Clean clip saved → captures/_smoke/welcome.png`);

  // Prove the rail drives state: jump to the carousel and screenshot slide1.
  await page.selectOption('select.dev-jump', 'carousel');
  await page.waitForTimeout(600);
  await frame.screenshot({ path: path.join(OUT_DIR, 'carousel.png') });
  console.log('✓ Screen jump worked → captures/_smoke/carousel.png');
} catch (err) {
  ok = false;
  console.error('✗ Smoke test threw:', err.message);
} finally {
  if (consoleErrors.length) console.log(`\nconsole errors (${consoleErrors.length}):\n  ` + consoleErrors.slice(0, 10).join('\n  '));
  if (pageErrors.length) console.log(`\npage errors (${pageErrors.length}):\n  ` + pageErrors.slice(0, 10).join('\n  '));
  if (failedRequests.length) console.log(`\nfailed requests (${failedRequests.length}):\n  ` + failedRequests.slice(0, 10).join('\n  '));
  await browser.close();
  await close();
  console.log(ok ? '\nSMOKE OK' : '\nSMOKE FAILED');
  process.exit(ok ? 0 : 1);
}
