import { expect, test } from '@playwright/test';

import { recordConsole, recordRequests, routePath, SAMPLE_DOC } from './helpers/serve';

/**
 * The permanent spec — keep it small.
 *
 * It answers three questions and no others: does the exported site boot, does it
 * say anything alarming, and does it ask anyone else for anything. The third is
 * the one that matters. `scripts/check-no-external.mjs` covers what the HTML and
 * CSS *declare*; nothing but a request log covers what the shipped scripts
 * *execute*, and W4 ("privacy is the product") is a promise about the second.
 *
 * Everything feature-shaped belongs in e2e/regression/.
 */
test('the site boots, stays quiet, and asks nobody for anything', async ({ page }) => {
  const log = recordConsole(page);
  const net = recordRequests(page);

  const landing = await page.goto(routePath('/'), { waitUntil: 'networkidle' });
  expect(landing?.status(), 'the landing page must be served').toBe(200);
  await expect(page.locator('#main')).toBeVisible();
  expect(await page.title()).not.toBe('');

  const doc = await page.goto(routePath(SAMPLE_DOC), { waitUntil: 'networkidle' });
  expect(doc?.status(), `${SAMPLE_DOC} must be exported`).toBe(200);
  await expect(page.locator('h1')).toBeVisible();

  // Hydrate something, so the assertion below covers executed code and not just
  // the initial document. The palette is where a hosted search would arrive.
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByRole('dialog', { name: 'Search docs' })).toBeVisible();

  // The build's own assets loaded. `basePath` is invisible until they don't:
  // a missing one still passes `next build`, and 404s every URL on Pages (W7).
  expect(net.matching(/\.css(\?|$)/), 'a stylesheet must load').not.toEqual([]);
  expect(net.matching(/\.js(\?|$)/), 'the client chunks must load').not.toEqual([]);
  expect(net.failures(), 'every subresource must resolve').toEqual([]);

  // W4, the runtime half. Same-origin or an inline scheme; nothing else exists.
  expect(
    net.offOrigin(),
    'a third-party request left the page — W4 is zero, not "only analytics"',
  ).toEqual([]);

  expect(log.errors, `console errors:\n${log.errors.join('\n')}`).toEqual([]);

  // A request log that recorded nothing would satisfy every assertion above.
  expect(net.urls.length, 'the request log itself must not be empty').toBeGreaterThan(3);
});

/**
 * Pages serves `404.html` for anything it cannot find, with a real 404 status —
 * so the site's own not-found page is the one readers hit, not GitHub's.
 */
test('an unknown path serves the site’s own 404', async ({ page }) => {
  const response = await page.goto(routePath('/no-such-page'));

  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).toContainText('404');
  // Still the site, not a bare error: chrome and a way back.
  await expect(page.locator('header.ws-hd')).toBeVisible();
});
