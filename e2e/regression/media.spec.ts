import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { FLAT_NAV } from '../../content/nav';
import { BASE_PATH } from '../../lib/site';
import {
  ALL_ROUTES,
  docsPath,
  DOCS_CONTENT_DIR,
  PUBLIC_DIR,
  recordRequests,
  REPO_ROOT,
  routePath,
} from '../helpers/serve';

/**
 * REGRESSION — media (plan W5): every figure is a sized still with alt text, or
 * a labelled placeholder, and **no GIF is fetched until a reader presses play**.
 *
 * That second one is the whole reason poster-first exists. Four GIFs on a page
 * is 8 MB on load, and a GIF cannot be paused, so `prefers-reduced-motion` has
 * no effect on one that is already running. Loading on demand fixes both — and
 * it only holds if something checks the network log, because the failure mode is
 * a page that looks identical and weighs eight times as much.
 */

const GIF_DIR = join(PUBLIC_DIR, 'media', 'gifs');

test('every figure is a sized still with alt text, or a tracked placeholder', async ({ page }) => {
  const net = recordRequests(page);
  let figures = 0;

  for (const route of ALL_ROUTES) {
    const response = await page.goto(routePath(route), { waitUntil: 'networkidle' });
    expect(response?.status(), `${route} must be exported`).toBe(200);

    const found = await page.locator('figure.ws-media').evaluateAll((els) =>
      els.map((el) => {
        const box = el.querySelector('.ws-mediabox');
        const img = el.querySelector('img');
        return {
          placeholder: box?.getAttribute('data-placeholder') ?? null,
          playable: box?.getAttribute('data-playable') ?? null,
          assetId: el.querySelector('.ws-mediabox-aid')?.textContent?.trim() ?? '',
          alt: img?.getAttribute('alt') ?? null,
          width: img?.getAttribute('width') ?? null,
          height: img?.getAttribute('height') ?? null,
          src: img?.getAttribute('src') ?? null,
          loading: img?.getAttribute('loading') ?? null,
        };
      }),
    );

    for (const figure of found) {
      figures += 1;
      const where = `${route} → ${figure.assetId || figure.alt || '(unnamed figure)'}`;

      if (figure.placeholder === 'true') {
        // An asset that has not been captured yet renders a labelled box of the
        // same shape (plan §4.4), never a broken image.
        expect(figure.src, `${where}: a placeholder must not ship an <img>`).toBeNull();
        expect(figure.assetId, `${where}: a placeholder must name its asset id`).not.toBe('');
        continue;
      }

      expect(figure.src, `${where}: a figure is either an image or a placeholder`).not.toBeNull();
      expect(figure.alt?.trim(), `${where}: alt text says what changed`).not.toBe('');
      // Explicit intrinsic size, or the page reflows as each still arrives.
      expect(Number(figure.width), `${where}: needs a width attribute`).toBeGreaterThan(0);
      expect(Number(figure.height), `${where}: needs a height attribute`).toBeGreaterThan(0);
      expect(figure.src, `${where}: assets are served from the base path`).toContain(
        `${BASE_PATH}/media/`,
      );
      // The still is what renders. Whether a GIF exists is a separate question,
      // and `data-playable` must answer it with a literal either way — React
      // drops an attribute whose value is `undefined`, which would leave the
      // false state unaddressable from CSS and from here.
      expect(['true', 'false'], `${where}: data-playable must be a literal`).toContain(
        figure.playable,
      );
      expect(figure.src, `${where}: the poster is a still, never the animation`).toMatch(/\.png$/);
      expect(['lazy', 'eager'], `${where}: loading must be explicit`).toContain(figure.loading);
    }
  }

  expect(figures, 'no media figures found at all — this test proved nothing').toBeGreaterThan(0);
  expect(
    net.matching(/\.gif(\?|$)/),
    'a GIF was fetched without anyone pressing play (W5)',
  ).toEqual([]);
});

/** Every page (and the landing page) that references an asset id. */
function pagesUsing(assetId: string): string[] {
  const hits: string[] = [];

  for (const item of FLAT_NAV) {
    const file = join(DOCS_CONTENT_DIR, `${item.slug}.mdx`);
    if (existsSync(file) && readFileSync(file, 'utf8').includes(assetId)) {
      hits.push(docsPath(item.slug));
    }
  }

  const landing = join(REPO_ROOT, 'app', 'page.tsx');
  if (existsSync(landing) && readFileSync(landing, 'utf8').includes(assetId)) {
    hits.push(routePath('/'));
  }

  return hits;
}

test('pressing play is what fetches the GIF, and only then', async ({ page }) => {
  const assets = existsSync(GIF_DIR)
    ? readdirSync(GIF_DIR)
        .filter((file) => file.endsWith('.gif'))
        .map((file) => file.replace(/\.gif$/, ''))
    : [];

  test.skip(
    assets.length === 0,
    'no GIFs committed yet (MEDIA-1) — the poster half is covered above',
  );

  const target = assets
    .map((assetId) => ({ assetId, routes: pagesUsing(assetId) }))
    .find((candidate) => candidate.routes.length > 0);

  test.skip(
    target === undefined,
    `GIFs exist in public/media/gifs but no page references them: ${assets.join(', ')}`,
  );
  if (target === undefined) return;

  const route = target.routes[0];
  const net = recordRequests(page);
  await page.goto(route, { waitUntil: 'networkidle' });

  expect(net.matching(/\.gif(\?|$)/), 'nothing animated may load unasked').toEqual([]);

  // `MediaFigure` decides at build time whether a figure is playable, by looking
  // for the file on disk. So a GIF added after the last export is present in the
  // repo and absent from the site, which is worth saying plainly rather than
  // timing out on a locator.
  const playable = page.locator('.ws-mediabox[data-playable="true"]');
  expect(
    await playable.count(),
    `${route} renders no playable figure although public/media/gifs/${target.assetId}.gif ` +
      'exists — out/ was exported before the asset landed. Rebuild.',
  ).toBeGreaterThan(0);

  const figure = playable.first();
  const image = figure.locator('img');
  await expect(image).toHaveAttribute('src', /\.png$/);
  await expect(figure.locator('.ws-mediabox-badge')).toHaveText(/press play/i);

  await figure.locator('.ws-mediabox-play').click();

  await expect(image).toHaveAttribute('src', /\.gif$/);
  await expect(figure.locator('.ws-mediabox-badge')).toHaveText('Playing');
  await expect
    .poll(() => net.matching(/\.gif(\?|$)/).length, {
      message: 'the GIF must actually be fetched once play is pressed',
    })
    .toBeGreaterThan(0);

  // A GIF cannot be paused, so there is nothing to press twice.
  await expect(figure.locator('.ws-mediabox-play')).toHaveCount(0);
});
