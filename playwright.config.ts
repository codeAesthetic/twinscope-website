import { defineConfig } from '@playwright/test';

import { ORIGIN, siteWebServer } from './e2e/helpers/serve';

/**
 * Verifies the **exported** site (plan §6): `npm run build`, then serve `out/`
 * at the base path the way Pages does, then drive it. Nothing here talks to the
 * dev server — `next dev` has no `basePath`-baked HTML and no static export, so
 * a pass against it would prove the wrong thing.
 *
 * `testDir` + `testMatch` are load-bearing. The app repo left them off once and
 * Playwright scanned the whole repo, then tried to execute vitest specs and
 * failed with "Vitest cannot be imported in a CommonJS module".
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,

  // A static site holds no state between tests, so pages can be checked in
  // parallel — which is what keeps 27 docs pages a few seconds rather than a
  // coffee break.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,

  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [['list']],
  outputDir: './e2e/.artifacts/test-output',

  webServer: siteWebServer(),

  use: {
    baseURL: ORIGIN,

    // The site is dark by default and system-aware, so the emulated preference
    // decides which theme a fresh visit gets. Pinning it to dark means every
    // spec runs in the site's own default; the specs that care about the other
    // theme store a preference explicitly (`withSavedTheme`), which outranks it.
    colorScheme: 'dark',

    // Wide enough for the three-column docs shell (sidebar · prose · TOC rail);
    // the responsive assertions resize per test.
    viewport: { width: 1280, height: 900 },

    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
});
