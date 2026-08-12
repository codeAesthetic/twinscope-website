/**
 * Serves the built site the way GitHub Pages does — mounted at `basePath`.
 *
 * This matters more than it looks. `out/` is the site root, but every asset in
 * it is referenced as `/twinscope-website/_next/…` because Pages serves a
 * project site from a sub-path. Serving `out/` at `/` therefore 404s every
 * stylesheet, while `next build` stays green — so a naive local preview would
 * "work" in exactly the way the deployment does not, or fail in a way the
 * deployment will not. Neither is useful.
 *
 * A symlink at `.serve/<basePath> → out` reproduces the real shape.
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_PATH = '/twinscope-website';
const PORT = Number(process.env.PORT ?? 4321);

const out = join(root, 'out');
if (!existsSync(out)) {
  console.error('[serve] no out/ — run `npm run build` first.');
  process.exit(1);
}

const serveRoot = join(root, '.serve');
const mount = join(serveRoot, BASE_PATH.slice(1));
mkdirSync(serveRoot, { recursive: true });
rmSync(mount, { force: true, recursive: false });
symlinkSync(out, mount, 'dir');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);

  // Contain the path to .serve — a request cannot climb out with `..`.
  const target = join(serveRoot, normalize(url).replace(/^(\.\.[/\\])+/, ''));
  if (!target.startsWith(serveRoot)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  const candidates = [target, join(target, 'index.html'), `${target}.html`];
  const file = candidates.find((c) => existsSync(c) && statSync(c).isFile());

  if (!file) {
    // Pages serves 404.html and a real 404 status.
    const notFound = join(mount, '404.html');
    const body = existsSync(notFound) ? readFileSync(notFound) : 'Not found';
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }).end(body);
    return;
  }

  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT, () => {
  console.log(`[serve] http://localhost:${PORT}${BASE_PATH}/`);
  console.log('[serve] mounted at basePath, the way GitHub Pages serves it.');
});
