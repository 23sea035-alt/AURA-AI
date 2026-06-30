// Minimal dependency-free static file server for the Claude Design prototypes.
//
// The prototype HTML loads its local `.jsx`/`.js` via <script type="text/babel" src=...>,
// which Babel fetches over XHR — `file://` fails that fetch (CORS), so the prototypes MUST be
// served over http. This server does exactly that and nothing more.
//
// Used two ways:
//   • `node serve.mjs`            → long-running server (manual browsing / debugging)
//   • import { startServer }      → capture/clip/burst scripts boot + stop it in-process

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// The prototypes we serve live one level up from the harness, in ../claude-design.
const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url)); // .../harness/lib
export const PROTOTYPE_ROOT = path.resolve(HARNESS_DIR, '..', '..', 'claude-design');

// Companion avatar art is canonical in the app (client/assets/avatars/), since that's where the
// RN port will use it. The prototype references it as `brand/avatars/<name>.png` relative to its
// own root, which is outside the served folder — so we alias that URL prefix to the client folder.
// This keeps one source of truth (no duplicate PNGs in claude-design) and needs no prototype edit.
const CLIENT_AVATARS = path.resolve(HARNESS_DIR, '..', '..', '..', '..', 'client', 'assets', 'avatars');
const URL_ALIASES = { '/brand/avatars/': CLIENT_AVATARS };

function resolveAlias(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  for (const [prefix, dir] of Object.entries(URL_ALIASES)) {
    if (clean.startsWith(prefix)) {
      const rel = clean.slice(prefix.length);
      const resolved = path.normalize(path.join(dir, rel));
      return resolved.startsWith(dir) ? resolved : null; // refuse traversal out of the alias dir
    }
  }
  return undefined; // not aliased
}

// Content types. Babel reads response text regardless of MIME, so `.jsx` as JS is fine;
// the important ones are html/css/font so the browser renders correctly.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.jsx': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function safeJoin(root, urlPath) {
  // Strip query/hash, decode, normalize, and refuse to escape the root.
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const resolved = path.normalize(path.join(root, clean));
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

/**
 * Start a static server rooted at `root` (defaults to the prototype folder).
 * @param {{ root?: string, port?: number }} [opts]
 * @returns {Promise<{ server: import('node:http').Server, port: number, url: string, close: () => Promise<void> }>}
 */
export function startServer({ root = PROTOTYPE_ROOT, port = 0 } = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      const aliased = resolveAlias(req.url || '/');
      let filePath = aliased === undefined ? safeJoin(root, req.url || '/') : aliased;
      if (!filePath) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      let info = await stat(filePath).catch(() => null);
      if (info?.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        info = await stat(filePath).catch(() => null);
      }
      if (!info) {
        res.writeHead(404).end('Not found');
        return;
      }
      const body = await readFile(filePath);
      const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      res.end(body);
    } catch (err) {
      res.writeHead(500).end(String(err));
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const actualPort = server.address().port;
      resolve({
        server,
        port: actualPort,
        url: `http://127.0.0.1:${actualPort}`,
        close: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}
