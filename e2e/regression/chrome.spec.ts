import { expect, test, type Locator, type Page } from '@playwright/test';

import { BASE_PATH } from '../../lib/site';
import { filePath, ORIGIN, routePath, SAMPLE_DOC, THEME_KEY } from '../helpers/serve';

/**
 * REGRESSION — the site chrome: header, nav state, theme, skip link, and the
 * docs sidebar's mobile disclosure.
 *
 * Everything here is asserted from computed styles, ARIA and stored state rather
 * than appearance, because those are the parts a screenshot cannot check and a
 * reviewer cannot see.
 */

const display = (locator: Locator): Promise<string> =>
  locator.evaluate((el) => getComputedStyle(el).display);

const token = (page: Page, name: string): Promise<string> =>
  page.evaluate(
    (property) => getComputedStyle(document.documentElement).getPropertyValue(property).trim(),
    name,
  );

const bodyBackground = (page: Page): Promise<string> =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** `#07090c` → `rgb(7, 9, 12)`, so a token can be compared to a computed colour. */
function hexToRgb(hex: string): string {
  const clean = hex.trim().replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => `${c}${c}`)
          .join('')
      : clean;
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

// ── header ───────────────────────────────────────────────────────────────────

const NAV_STATE: readonly { route: string; marked: string | null }[] = [
  { route: '/', marked: null },
  { route: '/download', marked: 'Download' },
  { route: '/changelog', marked: 'Changelog' },
  { route: SAMPLE_DOC, marked: 'Docs' },
];

test('the header is present, sticky, and marks the current section', async ({ page }) => {
  for (const { route, marked } of NAV_STATE) {
    const response = await page.goto(routePath(route));
    expect(response?.status(), `${route} must be exported`).toBe(200);

    const header = page.locator('header.ws-hd');
    await expect(header).toBeVisible();
    expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
    expect(await header.evaluate((el) => getComputedStyle(el).top)).toBe('0px');

    const current = page.locator('.ws-nav a[aria-current="page"]');
    if (marked === null) {
      // The landing page is not one of the nav sections, so nothing is marked —
      // a link matched by a `startsWith` accident would show up here.
      await expect(current).toHaveCount(0);
    } else {
      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(marked);
    }
  }

  // Sticky only sticks if nothing above it is clipped or transformed, which is a
  // layout property no computed style reports. Scroll and look.
  await page.goto(routePath(SAMPLE_DOC));
  await page.evaluate(() => window.scrollTo(0, 800));
  await expect
    .poll(async () => Math.round((await page.locator('header.ws-hd').boundingBox())?.y ?? -1))
    .toBe(0);
});

/**
 * The palette's links are plain `<a href>`, so nothing adds the base path for
 * them. A root-relative href on a project Pages site resolves against the origin
 * root — `/docs/engines/text` rather than `/twinscope-website/docs/engines/text`
 * — which is a 404 for every reader and invisible locally unless `out/` is
 * served the way Pages serves it (W7).
 */
test('the ⌘K palette keeps its links inside the base path', async ({ page }) => {
  await page.goto(routePath(SAMPLE_DOC));
  await page.keyboard.press('ControlOrMeta+k');

  const dialog = page.getByRole('dialog', { name: 'Search docs' });
  await expect(dialog).toBeVisible();

  const hrefs = await dialog
    .locator('a')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
  expect(hrefs.length, 'an empty query lists every page').toBeGreaterThan(0);

  for (const href of hrefs) {
    expect(href, `palette link "${href}" drops the base path`).toContain(`${BASE_PATH}/docs/`);
  }
});

// ── theme ────────────────────────────────────────────────────────────────────

test('the theme toggle flips, repaints, and persists', async ({ page }) => {
  await page.goto(routePath(SAMPLE_DOC));

  // Nothing stored yet: this is a first visit, and the emulated preference is
  // dark (playwright.config.ts), which is also the site's default.
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBeNull();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  const toggle = page.locator('header.ws-hd').getByRole('button', { name: /switch to/i });
  await expect(toggle).toHaveAttribute('data-theme-state', 'dark');

  const darkToken = await token(page, '--bg');
  expect(darkToken, 'tokens are plain hex in styles/tokens.css').toMatch(
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i,
  );
  expect(await bodyBackground(page)).toBe(hexToRgb(darkToken));

  await toggle.click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(toggle).toHaveAttribute('data-theme-state', 'light');
  expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe('light');

  // The attribute is not the point — the tokens it re-resolves are.
  const lightToken = await token(page, '--bg');
  expect(lightToken, 'light must not resolve to the dark palette').not.toBe(darkToken);
  expect(await bodyBackground(page)).toBe(hexToRgb(lightToken));

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await bodyBackground(page)).toBe(hexToRgb(lightToken));

  // And it offers the way back, from the DOM rather than from its own copy of
  // the state (ThemeToggle subscribes to <html data-theme>).
  await expect(
    page.locator('header.ws-hd').getByRole('button', { name: 'Switch to dark theme' }),
  ).toBeVisible();
});

test('dark is the default, the system is honoured, and a stored choice wins', async ({
  browser,
  request,
}) => {
  // Before any JavaScript runs at all: the exported HTML itself says dark, which
  // is what keeps a dark-default site from flashing white.
  const html = await (await request.get(filePath('index.html'))).text();
  expect(html).toMatch(/<html[^>]+data-theme="dark"/);

  // And the bootstrap that may change it runs in <head>, synchronously. Anything
  // deferred is a flash, and anything reading a different key than the toggle
  // writes is a preference that does not stick.
  const head = html.slice(0, html.indexOf('<body'));
  expect(head, 'the theme bootstrap must run before the body').toContain(THEME_KEY);

  // A reader who has chosen light in their OS gets light: the default is dark,
  // not an override.
  // A context made by hand gets none of the config's `use` options, so the
  // origin has to come with it.
  const systemLight = await browser.newContext({ baseURL: ORIGIN, colorScheme: 'light' });
  try {
    const page = await systemLight.newPage();
    await page.goto(routePath('/'));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  } finally {
    await systemLight.close();
  }

  // A stored choice outranks the system in both directions.
  const systemDark = await browser.newContext({ colorScheme: 'dark' });
  try {
    const page = await systemDark.newPage();
    await page.addInitScript((key) => localStorage.setItem(key, 'light'), THEME_KEY);
    await page.goto(routePath('/'));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  } finally {
    await systemDark.close();
  }
});

// ── skip link ────────────────────────────────────────────────────────────────

test('the skip link is first in the tab order and hands over to the content', async ({ page }) => {
  await page.goto(routePath(SAMPLE_DOC));

  const skip = page.locator('a.ws-skip');
  await expect(skip).toHaveAttribute('href', '#main');
  // Off-canvas until it matters — hidden by position, not by `display: none`,
  // which would take it out of the tab order entirely.
  expect(await skip.evaluate((el) => el.getBoundingClientRect().left)).toBeLessThan(0);

  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => document.activeElement?.className ?? ''),
    'the first Tab of a page must reach the skip link',
  ).toContain('ws-skip');
  expect(await skip.evaluate((el) => el.getBoundingClientRect().left)).toBeGreaterThanOrEqual(0);

  await page.keyboard.press('Enter');
  expect(new URL(page.url()).hash).toBe('#main');

  // Focus itself does not move to a non-focusable target; the *sequential focus
  // navigation starting point* does. So the honest assertion is that the next
  // Tab lands inside the content, having skipped the whole header.
  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => {
      const main = document.getElementById('main');
      const active = document.activeElement;
      return main !== null && active !== null && main.contains(active);
    }),
    'after the skip link, the next Tab must be inside #main',
  ).toBe(true);
});

// ── docs sidebar ─────────────────────────────────────────────────────────────

test('the docs sidebar is a disclosure on a phone and always open on a desktop', async ({
  page,
}) => {
  await page.goto(routePath(SAMPLE_DOC));

  const nav = page.locator('.ws-docnav');
  const toggle = page.locator('.ws-docnav-toggle');
  const groups = page.locator('.ws-docnav-groups');
  const links = nav.locator('a');

  // 1280: the disclosure button does not exist visually and `data-open` is inert.
  expect(await display(toggle)).toBe('none');
  await expect(groups).toBeVisible();
  await expect(nav).toHaveAttribute('data-open', 'false');
  const desktopLinks = await links.count();
  expect(desktopLinks).toBeGreaterThan(0);

  // 375: same markup, now a collapsed disclosure.
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await display(toggle)).toBe('block');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(groups).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(nav).toHaveAttribute('data-open', 'true');
  await expect(groups).toBeVisible();

  // A phone gets the whole nav, not a subset of it.
  expect(await links.count()).toBe(desktopLinks);

  // The header's own nav is the one thing that goes away at this width, so the
  // sidebar is the only route to another page — hence it must be reachable.
  expect(await display(page.locator('.ws-nav'))).toBe('none');
});
