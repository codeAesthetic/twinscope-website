import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { Page, PlaywrightTestConfig } from '@playwright/test';

import { FLAT_NAV } from '../../content/nav';
import { BASE_PATH } from '../../lib/site';

/**
 * The suite's harness: the built site served the way GitHub Pages serves it,
 * plus the route lists and recorders every spec needs.
 *
 * Serving `out/` at `/` would 404 every asset, because a static export bakes
 * `/twinscope-website/_next/…` into the HTML (plan W7) — a local preview that
 * fails in a way the deployment will not is as useless as one that passes in a
 * way it will not. `scripts/serve.mjs` already reproduces the deployed shape
 * with a `.serve/<basePath> → out` symlink, so this module *drives that script*
 * rather than reimplementing it: the suite and `npm run serve` cannot end up
 * disagreeing about what the site looks like.
 */

export const REPO_ROOT = resolve(__dirname, '..', '..');
export const OUT_DIR = join(REPO_ROOT, 'out');
export const PUBLIC_DIR = join(REPO_ROOT, 'public');
export const DOCS_CONTENT_DIR = join(REPO_ROOT, 'content', 'docs');

/** Same default as `scripts/serve.mjs`, so one running server serves both. */
export const PORT = Number(process.env.PORT ?? 4321);
export const ORIGIN = `http://127.0.0.1:${PORT}`;

/** localStorage key the theme bootstrap in `app/layout.tsx` reads and writes. */
export const THEME_KEY = 'twinscope-theme';
export type Theme = 'dark' | 'light';

/**
 * A page's path on the deployed site: base path in front, trailing slash behind
 * (W17). Deliberately the same cleaning as `absoluteUrl()` in lib/site.ts, so a
 * canonical URL and the address a spec visits are built the same way.
 */
export function routePath(route: string): string {
  const clean = route === '/' ? '/' : `/${route.replace(/^\/|\/$/g, '')}/`;
  return `${BASE_PATH}${clean}`;
}

/** A file rather than a page — sitemap.xml, robots.txt, an asset. No trailing slash. */
export function filePath(path: string): string {
  return `${BASE_PATH}/${path.replace(/^\//, '')}`;
}

export function docsPath(slug: string): string {
  return routePath(`/docs/${slug}`);
}

export const TOP_ROUTES: readonly string[] = ['/', '/download', '/changelog'];
export const DOC_ROUTES: readonly string[] = FLAT_NAV.map((item) => `/docs/${item.slug}`);
export const ALL_ROUTES: readonly string[] = [...TOP_ROUTES, ...DOC_ROUTES];

/**
 * One docs page, for the specs that only need "a docs page". `engines/text`
 * exercises the most content components (media figure, diff sample, callout,
 * code block, table), and falls back to the first page in the nav if it is ever
 * renamed — a hard-coded slug would fail as a missing route rather than as the
 * rename it is.
 */
const RICHEST = 'engines/text';
export const SAMPLE_DOC = `/docs/${
  FLAT_NAV.some((item) => item.slug === RICHEST) ? RICHEST : FLAT_NAV[0].slug
}`;

/**
 * The `webServer` entry for playwright.config.ts.
 *
 * Reuse is safe outside CI: `scripts/serve.mjs` reads each file per request
 * through the symlink, so an already-running server always serves the current
 * `out/` rather than a snapshot of it.
 */
export function siteWebServer(): NonNullable<PlaywrightTestConfig['webServer']> {
  if (!existsSync(join(OUT_DIR, 'index.html'))) {
    throw new Error(
      'e2e: no out/index.html — run `npm run build` before `npm run verify`. ' +
        'The suite verifies the exported site, not the dev server.',
    );
  }

  return {
    command: 'node scripts/serve.mjs',
    cwd: REPO_ROOT,
    url: `${ORIGIN}${routePath('/')}`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 30_000,
  };
}

/**
 * Stores a theme choice before the first paint of the next navigation.
 *
 * A saved value outranks the system preference in the bootstrap, so this pins
 * the theme regardless of what `colorScheme` the context emulates — which is
 * what makes "run this route in both themes" deterministic.
 */
export async function withSavedTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // A context without storage access still renders; the default applies.
      }
    },
    [THEME_KEY, theme] as const,
  );
}

/** Console output of a page, newest last. Assert `errors` is empty. */
export interface ConsoleLog {
  all: string[];
  errors: string[];
}

export function recordConsole(page: Page): ConsoleLog {
  const log: ConsoleLog = { all: [], errors: [] };

  page.on('console', (message) => {
    const line = `[${message.type()}] ${message.text()}`;
    log.all.push(line);
    if (message.type() === 'error') log.errors.push(line);
  });
  page.on('pageerror', (error) => {
    log.errors.push(`[pageerror] ${error.message}`);
  });

  return log;
}

/**
 * Every URL the page asked for, and every subresource that did not arrive.
 *
 * This is the runtime half of W4: `scripts/check-no-external.mjs` covers what
 * the HTML and CSS *declare*, and a request log covers what the scripts
 * actually *execute* — the half a static scan cannot see.
 */
export interface RequestLog {
  urls: string[];
  /** Unique URLs that are neither same-origin nor an inline scheme. */
  offOrigin(): string[];
  matching(pattern: RegExp): string[];
  /** `404 <url>` for subresources that failed to load. */
  failures(): string[];
}

/** Schemes that never leave the machine. */
const INLINE = /^(data|blob|about|filesystem):/i;

/**
 * Only these count as failures. Next's App Router prefetches route payloads
 * (`…/__next.*.txt`) as `fetch`, and a prefetch that misses is a cache detail,
 * not a broken page — while a 404 stylesheet is exactly the `basePath` failure
 * W7 exists to prevent.
 */
const SUBRESOURCE = new Set(['document', 'stylesheet', 'script', 'image', 'font', 'media']);

export function recordRequests(page: Page): RequestLog {
  const urls: string[] = [];
  const failures: string[] = [];

  page.on('request', (request) => {
    urls.push(request.url());
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400 && SUBRESOURCE.has(response.request().resourceType())) {
      failures.push(`${status} ${response.url()}`);
    }
  });

  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? 'failed';
    // A navigation cancels in-flight requests; that is not a broken link.
    if (reason.includes('ERR_ABORTED')) return;
    if (SUBRESOURCE.has(request.resourceType())) failures.push(`${reason} ${request.url()}`);
  });

  return {
    urls,
    offOrigin: () => [...new Set(urls.filter((u) => !u.startsWith(ORIGIN) && !INLINE.test(u)))],
    matching: (pattern) => urls.filter((u) => pattern.test(u)),
    failures: () => [...new Set(failures)],
  };
}
