/**
 * Fails when the built output would make the browser fetch from a third party
 * (plan W4).
 *
 * "No analytics, no CDN fonts, no embeds" is only true if something checks. That
 * regression arrives as one innocuous <script src>, not as a decision anyone
 * announces.
 *
 * What counts as a violation is narrower than "an absolute URL appears":
 *  - our own origin is fine — canonical and OG tags are absolute by design (W18)
 *  - <a href> is fine; a reader chooses to follow it
 *  - <link href> counts only for rel values the browser fetches or connects to
 *  - script/img/iframe/srcset/@import always count
 *
 * Scope: HTML and CSS only. Minified JS cannot be scanned this way — Next ships
 * `new URL("https://a@b")` as URL-parser feature detection, which any `url(`
 * pattern matches case-insensitively, and chasing that produces a check people
 * learn to ignore. What actually covers script behaviour is the runtime
 * assertion in `e2e/verify.spec.ts`: load every route and require the network
 * log to contain no third-party request. Static check for what is declared,
 * runtime check for what is executed.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, '..', 'out');

/** Kept in step with lib/site.ts by the seo regression spec. */
const OWN_ORIGIN = 'https://codeaesthetic.github.io';

/** `rel` values that cause a network request, as opposed to describing one. */
const FETCHING_REL = new Set([
  'stylesheet',
  'preload',
  'modulepreload',
  'prefetch',
  'preconnect',
  'dns-prefetch',
  'icon',
  'shortcut',
  'apple-touch-icon',
  'manifest',
]);

const isThirdParty = (url) => /^https?:\/\//i.test(url) && !url.startsWith(OWN_ORIGIN);

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return ['.html', '.css'].includes(extname(full)) ? [full] : [];
  });
}

function violationsIn(text, ext) {
  const hits = new Set();

  // Always-fetched attributes on elements that fetch.
  for (const m of text.matchAll(
    /<(?:script|img|iframe|source|video|audio|embed)\b[^>]*?\b(?:src|srcset)\s*=\s*["']([^"']+)["']/gi,
  )) {
    if (isThirdParty(m[1])) hits.add(m[1]);
  }

  // <link>: only the rel values that actually hit the network.
  for (const tag of text.matchAll(/<link\b[^>]*>/gi)) {
    const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag[0])?.[1] ?? '';
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag[0])?.[1] ?? '';
    const fetches = rel
      .toLowerCase()
      .split(/\s+/)
      .some((token) => FETCHING_REL.has(token));
    if (fetches && isThirdParty(href)) hits.add(href);
  }

  // CSS: url() to another host — a webfont or background image.
  if (ext === '.css') {
    for (const m of text.matchAll(/url\(\s*["']?(https?:\/\/[^"')]+)/gi)) {
      if (isThirdParty(m[1])) hits.add(m[1]);
    }
  }
  for (const m of text.matchAll(/@import\s+(?:url\()?["']?(https?:\/\/[^"')]+)/gi)) {
    if (isThirdParty(m[1])) hits.add(m[1]);
  }

  return hits;
}

let files;
try {
  files = walk(out);
} catch {
  console.error('[check-no-external] no out/ directory — run `npm run build` first.');
  process.exit(1);
}

const findings = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const url of violationsIn(text, extname(file))) {
    findings.push(`  ${relative(out, file)} → ${url}`);
  }
}

if (findings.length) {
  console.error(`[check-no-external] ${findings.length} third-party subresource(s) in the build:`);
  console.error(findings.join('\n'));
  console.error('\nW4: inline it, self-host it, or drop it. Zero third-party requests.');
  process.exit(1);
}

console.log(`[check-no-external] ${files.length} built files, no third-party subresources.`);
