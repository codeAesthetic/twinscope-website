/**
 * Fails when a link in the built site points at something that is not there.
 *
 * Two failure modes matter here, and both are invisible to `next build`:
 *
 *  1. **A dead internal link.** `trailingSlash: true` (W17) means every route is
 *     a directory with an index.html, so `/docs/x/` is a file lookup — and a link
 *     to `/docs/y/` that nobody wrote is a 404 with a green build behind it.
 *  2. **A link that drops the base path.** A project Pages site serves from
 *     `/twinscope-website`, so a root-relative `/docs/x` resolves against the
 *     origin root and 404s for every reader (W7). `next/link` adds the prefix;
 *     a hand-written `<a href>` does not, and locally — served at `/` — both
 *     appear to work.
 *
 * External links are listed, never failed on: checking them needs the network,
 * and a CI job that fails because someone else's site is down teaches people to
 * re-run CI. What a link *inside* this repo points at is ours to guarantee.
 *
 * The candidate order below (exact file, then `/index.html`, then `.html`) is the
 * same one `scripts/serve.mjs` uses, which is the order Pages resolves in.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'out');

if (!existsSync(out)) {
  console.error('[check-links] no out/ — run `npm run build` first.');
  process.exit(1);
}

/**
 * Read from lib/site.ts rather than retyped: a checker with its own copy of the
 * base path is a checker that can pass while the site is broken.
 */
const siteSource = readFileSync(join(root, 'lib', 'site.ts'), 'utf8');

function constant(name) {
  const match = new RegExp(`export const ${name} = '([^']+)'`).exec(siteSource);
  if (!match) {
    console.error(`[check-links] cannot read ${name} from lib/site.ts.`);
    process.exit(1);
  }
  return match[1];
}

const BASE_PATH = constant('BASE_PATH');
const SITE_ORIGIN = constant('SITE_ORIGIN');
const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}`;

const SOURCES = [
  [/<a\b[^>]*?\shref\s*=\s*["']([^"']*)["']/gi, 'a href'],
  [/<link\b[^>]*?\shref\s*=\s*["']([^"']*)["']/gi, 'link href'],
  [/<(?:img|script|source|video|audio|embed|iframe)\b[^>]*?\ssrc\s*=\s*["']([^"']*)["']/gi, 'src'],
];

const decode = (value) =>
  value.replaceAll('&amp;', '&').replaceAll('&#x27;', "'").replaceAll('&quot;', '"');

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return extname(full) === '.html' ? [full] : [];
  });
}

/** `out/docs/x/index.html` → `/twinscope-website/docs/x/index.html`. */
const urlOf = (file) => `${BASE_PATH}/${relative(out, file).split(sep).join('/')}`;

/** The file a URL path resolves to, or `undefined`. */
function fileFor(urlPath) {
  const target = join(out, urlPath.slice(BASE_PATH.length));
  return [target, join(target, 'index.html'), `${target}.html`].find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );
}

const idCache = new Map();

function idsIn(file) {
  let ids = idCache.get(file);
  if (!ids) {
    ids = new Set(
      [...readFileSync(file, 'utf8').matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]),
    );
    idCache.set(file, ids);
  }
  return ids;
}

const pages = walk(out);
const dead = [];
const external = new Map();
let internal = 0;

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const here = relative(out, file);

  for (const [pattern, kind] of SOURCES) {
    for (const match of html.matchAll(pattern)) {
      const raw = decode(match[1].trim());
      if (raw === '' || raw === '#') continue;
      if (/^(mailto|tel):/i.test(raw)) {
        external.set(raw, (external.get(raw) ?? 0) + 1);
        continue;
      }
      if (/^(data|blob|javascript):/i.test(raw)) continue;

      let urlPath = raw;
      if (/^https?:\/\//i.test(raw)) {
        if (!raw.startsWith(SITE_URL)) {
          external.set(raw, (external.get(raw) ?? 0) + 1);
          continue;
        }
        // Our own absolute URLs (canonical, OG, JSON-LD) are internal links with
        // an origin in front of them, and worth resolving for exactly that reason.
        urlPath = raw.slice(SITE_ORIGIN.length);
      }

      const [pathPart, fragment = ''] = urlPath.split('#');
      internal += 1;

      // A fragment on its own points inside this very file.
      if (pathPart === '') {
        if (!idsIn(file).has(fragment)) {
          dead.push(`  ${here} → #${fragment} (no element on the page has that id)`);
        }
        continue;
      }

      const withoutQuery = pathPart.split('?')[0];
      const absolute = withoutQuery.startsWith('/')
        ? posix.normalize(withoutQuery)
        : posix.normalize(posix.join(posix.dirname(urlOf(file)), withoutQuery));

      if (absolute !== BASE_PATH && !absolute.startsWith(`${BASE_PATH}/`)) {
        dead.push(
          `  ${here} → ${raw} (${kind} leaves the base path — it 404s on Pages, ` +
            `use next/link or prefix ${BASE_PATH})`,
        );
        continue;
      }

      const target = fileFor(absolute);
      if (!target) {
        dead.push(`  ${here} → ${raw} (${kind} resolves to no file in out/)`);
        continue;
      }
      if (fragment !== '' && extname(target) === '.html' && !idsIn(target).has(fragment)) {
        dead.push(`  ${here} → ${raw} (the page exists, #${fragment} does not)`);
      }
    }
  }
}

if (pages.length === 0) {
  console.error('[check-links] out/ contains no HTML — the build produced nothing to check.');
  process.exit(1);
}

if (external.size > 0) {
  // Sorted by URL, so related links sit together and a typo in one of them reads
  // as a near-duplicate of its neighbour.
  const list = [...external.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  console.log(`[check-links] ${external.size} external link(s), not checked:`);
  for (const [url, count] of list) console.log(`  ${url}${count > 1 ? ` ×${count}` : ''}`);
}

if (dead.length > 0) {
  console.error(`[check-links] ${dead.length} broken link(s) in ${pages.length} page(s):`);
  console.error(dead.join('\n'));
  process.exit(1);
}

console.log(`[check-links] ${pages.length} page(s), ${internal} internal link(s), none broken.`);
