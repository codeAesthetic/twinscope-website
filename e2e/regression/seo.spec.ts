import { expect, test } from '@playwright/test';

import { FLAT_NAV } from '../../content/nav';
import { absoluteUrl, SITE, SITE_ORIGIN, SITE_URL } from '../../lib/site';
import { frontmatterOf } from '../../lib/toc';
import { ALL_ROUTES, filePath, routePath, SAMPLE_DOC } from '../helpers/serve';

/**
 * REGRESSION — W17 and W18: every route says what it is, and says it once.
 *
 * A static export is the best possible starting point for a crawler, but only if
 * each page carries its own title, description and canonical. Canonicals matter
 * more here than on a normal site: Pages cannot issue a 301, so a URL that
 * changes after launch is a dead link forever (W17), and the canonical is what
 * makes the eventual move to a real domain a re-point rather than a
 * duplicate-content cleanup.
 */

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogUrl: string;
  jsonLd: string[];
}

const readMeta = (): PageMeta => ({
  title: document.title,
  description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
  canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
  ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? '',
  jsonLd: Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(
    (node) => node.textContent ?? '',
  ),
});

test('every route has a unique title, a description, a correct canonical, and valid JSON-LD', async ({
  page,
}) => {
  const titles = new Map<string, string>();
  let landingTypes: string[] = [];

  for (const route of ALL_ROUTES) {
    const response = await page.goto(routePath(route));
    expect(response?.status(), `${route} must be exported`).toBe(200);

    const meta = await page.evaluate(readMeta);

    expect(meta.title.trim(), `${route} has no <title>`).not.toBe('');
    expect(meta.description.trim(), `${route} has no meta description (W18)`).not.toBe('');

    // Absolute, on the deployed origin, and pointing at this page — not at the
    // origin root, which is what a missing `metadataBase` produces.
    expect(meta.canonical, `${route}: canonical must be absolute on ${SITE_URL}`).toContain(
      SITE_URL,
    );
    expect(meta.canonical, `${route}: canonical must be this page's own URL`).toBe(
      absoluteUrl(route),
    );

    const clash = titles.get(meta.title);
    expect(clash, `${route} and ${clash} share the title “${meta.title}”`).toBeUndefined();
    titles.set(meta.title, route);

    // Docs metadata comes from the MDX frontmatter, so the page and its <head>
    // must be quoting the same source.
    if (route.startsWith('/docs/')) {
      const front = await frontmatterOf(route.replace(/^\/docs\//, ''));
      expect(front, `${route}: frontmatter must have a title and a description`).toBeDefined();
      expect(meta.title, `${route}: title template is "%s · ${SITE.name}"`).toBe(
        `${front?.title} · ${SITE.name}`,
      );
      expect(meta.description, `${route}: description must be the frontmatter's`).toBe(
        front?.description,
      );
    }

    const types: string[] = [];
    for (const block of meta.jsonLd) {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(block) as Record<string, unknown>;
      } catch (cause) {
        throw new Error(`${route}: a JSON-LD block does not parse — ${String(cause)}`);
      }

      expect(String(data['@context']), `${route}: JSON-LD needs a schema.org context`).toContain(
        'schema.org',
      );
      const type = data['@type'];
      expect(
        typeof type === 'string' || Array.isArray(type),
        `${route}: JSON-LD needs a @type`,
      ).toBe(true);
      types.push(String(type));
    }
    if (route === '/') landingTypes = types;
  }

  expect(titles.size, 'titles must be unique across the whole site').toBe(ALL_ROUTES.length);

  // W18 names this one explicitly: the landing page is the app's entry in a
  // search result, so it describes the application, not an article.
  expect(landingTypes, 'the landing page carries SoftwareApplication (W18)').toContain(
    'SoftwareApplication',
  );
});

/**
 * W18 also asks for `BreadcrumbList` + `TechArticle` on docs pages. Neither is
 * emitted yet — `app/docs/[...slug]/page.tsx` renders no JSON-LD at all — so this
 * is marked as the outstanding half rather than deleted, which would lose the
 * requirement. Drop the `.fixme` when the tags land.
 */
test.fixme('docs pages carry BreadcrumbList and TechArticle structured data (W18)', async ({
  page,
}) => {
  await page.goto(routePath(SAMPLE_DOC));
  const types = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((node) => {
      const data = JSON.parse(node.textContent ?? '{}') as { '@type'?: unknown };
      return String(data['@type']);
    }),
  );

  expect(types).toContain('BreadcrumbList');
  expect(types).toContain('TechArticle');
});

test('the sitemap lists every route, and only routes that exist', async ({ request }) => {
  const response = await request.get(filePath('sitemap.xml'));
  expect(response.status(), 'app/sitemap.ts must export /sitemap.xml').toBe(200);

  const locations = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  expect(locations.length, 'an empty sitemap is not a passing sitemap').toBeGreaterThan(0);

  for (const route of ALL_ROUTES) {
    expect(locations, `${route} is missing from the sitemap`).toContain(absoluteUrl(route));
  }
  // Nothing extra: `/kitchen-sink` and any future unlisted page stay out of it,
  // and the count is what catches an entry nobody meant to add.
  expect(
    locations.length,
    `sitemap lists ${locations.length} URLs for ${ALL_ROUTES.length} routes`,
  ).toBe(ALL_ROUTES.length);

  for (const location of locations) {
    expect(location, 'sitemap URLs are absolute on the deployed origin').toContain(SITE_URL);
    // Trailing slash, one address per page (W17).
    expect(location, `${location} must end in a slash`).toMatch(/\/$/);

    const local = location.slice(SITE_ORIGIN.length);
    const page = await request.get(local);
    expect(page.status(), `${location} is in the sitemap but does not exist`).toBe(200);
  }
});

test('robots.txt allows everything and points at the sitemap', async ({ request }) => {
  const response = await request.get(filePath('robots.txt'));
  expect(response.status(), 'app/robots.ts must export /robots.txt').toBe(200);

  const body = await response.text();
  expect(body).toContain('Allow: /');
  // Absolute, because a project Pages site does not own the origin root where
  // crawlers look for robots.txt — the sitemap URL has to carry the base path.
  expect(body).toContain(`${SITE_URL}/sitemap.xml`);
});

test('the exported URL shape is the canonical one (W17)', async ({ request }) => {
  // Every route is a directory with an index.html, so `/docs/x/` is the address
  // and `/docs/x.html` does not exist. Without `trailingSlash` Next exports the
  // second while every link points at the first, and the canonical form is
  // ambiguous from launch — permanently, since Pages cannot redirect.
  for (const item of FLAT_NAV.slice(0, 3)) {
    const withSlash = await request.get(routePath(`/docs/${item.slug}`));
    expect(withSlash.status()).toBe(200);
    expect(withSlash.url(), 'no redirect: this is the address itself').toContain(
      routePath(`/docs/${item.slug}`),
    );
  }
});
