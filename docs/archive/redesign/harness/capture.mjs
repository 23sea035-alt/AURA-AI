// Capture a full contact sheet of one artifact: one clean 402x874 still per
// (screen, state, theme), plus a gallery.html for quick human review + sharing.
//
// Usage: node capture.mjs [artifact]      (artifact defaults to "onboarding")

import { chromium } from 'playwright';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startServer } from './lib/server.mjs';
import { expandMatrix, ARTIFACTS } from './matrix.mjs';
import { openArtifact, gotoScreen, watchErrors, FRAME } from './lib/driveRail.mjs';

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const artifact = process.argv[2] || 'onboarding';

const { file, entries } = expandMatrix(artifact);
const outDir = path.join(HARNESS_DIR, 'captures', artifact);
const stillsDir = path.join(outDir, 'stills');

const stillName = ({ screen, state, theme }) => `${screen}__${state ?? 'base'}__${theme}.png`;

const { url, close } = await startServer();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 1040 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const getErrors = watchErrors(page);

const failures = [];
try {
  await rm(stillsDir, { recursive: true, force: true });
  await mkdir(stillsDir, { recursive: true });
  await openArtifact(page, url, file);
  console.log(`Capturing "${artifact}" (${file}) — ${entries.length} stills`);

  const frame = page.locator(FRAME);
  for (const entry of entries) {
    const name = stillName(entry);
    try {
      await gotoScreen(page, entry);
      await frame.screenshot({ path: path.join(stillsDir, name) });
      process.stdout.write('.');
    } catch (err) {
      failures.push({ name, error: err.message });
      process.stdout.write('x');
    }
  }
  process.stdout.write('\n');

  await writeFile(path.join(outDir, 'gallery.html'), buildGallery(artifact, file, entries), 'utf8');
  console.log(`Gallery → captures/${artifact}/gallery.html`);
} catch (err) {
  console.error('\nCapture threw:', err.message);
  failures.push({ name: '(fatal)', error: err.message });
} finally {
  const { consoleErrors, pageErrors, failedRequests, badResponses } = getErrors();
  if (pageErrors.length) console.log(`\npage errors (${pageErrors.length}):\n  ` + pageErrors.slice(0, 8).join('\n  '));
  if (badResponses.length) console.log(`\nnon-OK responses (${badResponses.length}):\n  ` + badResponses.slice(0, 12).join('\n  '));
  if (failedRequests.length) console.log(`\nfailed requests (${failedRequests.length}):\n  ` + failedRequests.slice(0, 8).join('\n  '));
  if (consoleErrors.length) console.log(`\nconsole errors (${consoleErrors.length}): (see non-OK responses above for URLs)`);
  await browser.close();
  await close();
  if (failures.length) {
    console.log(`\nCAPTURE FAILED — ${failures.length} still(s) did not capture:`);
    for (const f of failures) console.log(`  ${f.name}: ${f.error}`);
    process.exit(1);
  }
  console.log(`\nCAPTURE OK — ${entries.length} stills`);
}

// ── gallery.html ────────────────────────────────────────────────────────────
function buildGallery(artifactKey, file, entries) {
  const art = ARTIFACTS[artifactKey];
  const byScreen = new Map();
  for (const e of entries) {
    if (!byScreen.has(e.screen)) byScreen.set(e.screen, []);
    byScreen.get(e.screen).push(e);
  }
  const sections = art.screens.map((s) => {
    const shots = byScreen.get(s.id) || [];
    const states = s.states.length ? s.states : [null];
    const rows = states.map((state) => {
      const cells = art.themes.map((theme) => {
        const e = shots.find((x) => x.state === state && x.theme === theme);
        const src = e ? `stills/${stillName(e)}` : '';
        return `<figure><img loading="lazy" src="${src}" alt="${s.id} ${state ?? ''} ${theme}"><figcaption>${theme}</figcaption></figure>`;
      }).join('');
      return `<div class="row"><div class="state">${state ?? '—'}</div><div class="shots">${cells}</div></div>`;
    }).join('');
    return `<section><h2>${s.label} <span class="id">${s.id}</span></h2>${rows}</section>`;
  }).join('');

  return `<!doctype html><meta charset="utf-8"><title>${artifactKey} — contact sheet</title>
<style>
  :root{color-scheme:light dark}
  body{font:14px/1.5 -apple-system,system-ui,sans-serif;margin:0;padding:24px;background:#16161a;color:#e6e6ea}
  h1{font-size:20px;margin:0 0 4px} .sub{color:#8a8a93;margin:0 0 24px}
  section{margin:0 0 28px;border-top:1px solid #2a2a32;padding-top:16px}
  h2{font-size:15px;margin:0 0 12px} h2 .id{color:#6a6a73;font-weight:400;font-size:12px}
  .row{display:flex;gap:16px;align-items:flex-start;margin:0 0 16px}
  .state{width:120px;flex:0 0 120px;color:#b9b9c2;font-weight:600;padding-top:6px;text-transform:capitalize}
  .shots{display:flex;gap:16px;flex-wrap:wrap}
  figure{margin:0} img{width:240px;height:auto;border-radius:14px;background:#000;display:block;box-shadow:0 6px 20px rgba(0,0,0,.4)}
  figcaption{color:#8a8a93;font-size:12px;margin-top:6px;text-align:center}
</style>
<h1>${artifactKey} — contact sheet</h1>
<p class="sub">${file} · ${entries.length} stills · screen × state × theme</p>
${sections}`;
}
