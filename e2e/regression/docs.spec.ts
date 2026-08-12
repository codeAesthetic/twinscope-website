import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { FLAT_NAV, groupOf, neighbours } from '../../content/nav';
import { SITE } from '../../lib/site';
import { headingsOf } from '../../lib/toc';
import { DOCS_CONTENT_DIR, docsPath } from '../helpers/serve';

/**
 * REGRESSION — the docs engine: every page in `content/nav.ts` exists, and the
 * four things built from the same list agree with it (sidebar, TOC rail, pager,
 * breadcrumb).
 *
 * One test per page, so a failure names the page rather than the loop.
 *
 * The TOC assertion is the one worth the most: `lib/toc.ts` extracts headings
 * from the MDX source with github-slugger, and `rehype-slug` puts ids on the
 * rendered headings with its own instance of it. Nothing connects them. When
 * they disagree the page still builds, the rail still renders, and the links
 * simply scroll nowhere — a defect no build error and no screenshot reports.
 */
for (const item of FLAT_NAV) {
  test(`docs page: ${item.slug}`, async ({ page }) => {
    const response = await page.goto(docsPath(item.slug));
    expect(response?.status(), `/docs/${item.slug} must be exported`).toBe(200);

    // ── the page ────────────────────────────────────────────────────────────
    const h1 = page.locator('h1');
    await expect(h1, 'exactly one h1 per page').toHaveCount(1);
    // The pager and the sidebar render `nav.ts`'s title while the page renders
    // its frontmatter title. A disagreement means a link that promises one page
    // and opens another.
    await expect(
      h1,
      `nav.ts calls this page “${item.title}” — the heading must say the same, because ` +
        'the sidebar and the pager both render the nav title. Align the two, or put the ' +
        'shorter form in `short` (which is what that field is for).',
    ).toHaveText(item.title);

    // ── the sidebar marks this page, and only this page ─────────────────────
    const marked = page.locator('.ws-docnav a[aria-current="page"]');
    await expect(marked).toHaveCount(1);
    await expect(marked).toHaveAttribute('href', docsPath(item.slug));

    // ── the breadcrumb files it under its group ─────────────────────────────
    const group = groupOf(item.slug);
    expect(group, 'every nav item belongs to a group').toBeDefined();
    await expect(page.locator('.ws-crumb')).toContainText(group?.label ?? '');

    // ── the rail, the source and the rendered ids all agree ────────────────
    const expected = await headingsOf(item.slug);
    const rail = await page.locator('.ws-toc a').evaluateAll((els) =>
      els.map((el) => ({
        href: el.getAttribute('href') ?? '',
        depth: el.getAttribute('data-depth') ?? '',
        text: el.textContent?.trim() ?? '',
      })),
    );

    expect(
      rail.map((entry) => entry.href),
      'the rail must list every h2/h3 in the MDX source, in order',
    ).toEqual(expected.map((heading) => `#${heading.id}`));
    expect(rail.map((entry) => entry.depth)).toEqual(
      expected.map((heading) => String(heading.depth)),
    );
    expect(rail.map((entry) => entry.text)).toEqual(expected.map((heading) => heading.text));

    const resolved = await page.evaluate(
      (hrefs) =>
        hrefs.map((href) => {
          const target = document.getElementById(href.slice(1));
          return { href, tag: target?.tagName.toLowerCase() ?? null };
        }),
      rail.map((entry) => entry.href),
    );
    for (const entry of resolved) {
      expect(
        entry.tag,
        `${entry.href} is in the rail but no element on the page has that id — ` +
          'lib/toc.ts and rehype-slug slugged the same heading differently',
      ).not.toBeNull();
      expect(['h2', 'h3']).toContain(entry.tag);
    }

    // ── every heading is linkable ──────────────────────────────────────────
    const headings = await page.locator('.ws-prose h2, .ws-prose h3').evaluateAll((els) =>
      els.map((el) => ({
        id: el.id,
        text: (el.textContent ?? '').replace(/#$/, '').trim().slice(0, 60),
        anchor: el.querySelector('a.ws-anchor')?.getAttribute('href') ?? null,
      })),
    );
    for (const heading of headings) {
      expect(heading.id, `heading “${heading.text}” has no id`).not.toBe('');
      expect(heading.anchor, `heading “${heading.text}” has no anchor link`).toBe(`#${heading.id}`);
    }

    // ── the pager walks the nav's reading order ────────────────────────────
    const { prev, next } = neighbours(item.slug);
    const prevLink = page.locator('.ws-pager a[data-dir="prev"]');
    const nextLink = page.locator('.ws-pager a[data-dir="next"]');

    if (prev) {
      await expect(prevLink).toHaveAttribute('href', docsPath(prev.slug));
      await expect(prevLink).toContainText(prev.title);
    } else {
      await expect(prevLink, 'the first page has no previous').toHaveCount(0);
    }
    if (next) {
      await expect(nextLink).toHaveAttribute('href', docsPath(next.slug));
      await expect(nextLink).toContainText(next.title);
    } else {
      await expect(nextLink, 'the last page has no next').toHaveCount(0);
    }

    // ── "Edit this page" points at the file this page was built from ───────
    const source = `content/docs/${item.slug}.mdx`;
    await expect(page.getByRole('link', { name: 'Edit this page' })).toHaveAttribute(
      'href',
      `${SITE.websiteRepo}/edit/main/${source}`,
    );
    // The repo half of that URL cannot be checked without a network call; the
    // path half can, and it is the half that drifts.
    expect(
      existsSync(join(DOCS_CONTENT_DIR, `${item.slug}.mdx`)),
      `${source} does not exist, so the edit link is a 404`,
    ).toBe(true);
  });
}

/**
 * The nav is the site's index: a page missing from it is unreachable, and a page
 * in it with no file fails the build. Asserted once, over the whole list, so the
 * count itself cannot quietly shrink.
 */
test('the nav lists every docs page and nothing else', async () => {
  expect(FLAT_NAV.length, 'plan §2 describes 27 docs pages').toBeGreaterThanOrEqual(20);

  const slugs = FLAT_NAV.map((item) => item.slug);
  expect(new Set(slugs).size, 'a duplicated slug would build one page twice').toBe(slugs.length);

  for (const slug of slugs) {
    expect(
      existsSync(join(DOCS_CONTENT_DIR, `${slug}.mdx`)),
      `content/docs/${slug}.mdx is listed in nav.ts but missing`,
    ).toBe(true);
  }
});
