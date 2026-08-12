import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { ALL_ROUTES, routePath, SAMPLE_DOC, type Theme, withSavedTheme } from '../helpers/serve';

/**
 * REGRESSION — axe on every kind of page, in both themes (plan WEB-5).
 *
 * Both themes is not padding: contrast is the failure mode this site actually
 * had. The mock's first draft of the code palette used dark-tuned literals that
 * measured 2.8:1 on `--panel-2` in light theme — a fail for what is body content
 * on a docs site, and invisible to anyone who only ever looks at the dark one.
 *
 * `serious` and `critical` fail. Lower impacts are reported by axe as advice and
 * a gate that fails on advice is a gate people learn to route around.
 */

type Violation = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number];

/** One contrast token can fail on fifty nodes; a sample plus the count is readable. */
const MAX_NODES = 6;

const format = (violation: Violation): string => {
  const targets = violation.nodes.map((node) => node.target.join(' '));
  const remaining = targets.length - MAX_NODES;

  return [
    `${violation.impact} · ${violation.id} · ${violation.help} — ${targets.length} node(s)`,
    ...targets.slice(0, MAX_NODES).map((target) => `    ${target}`),
    ...(remaining > 0 ? [`    … and ${remaining} more`] : []),
  ].join('\n');
};

/** One of each kind of page: home, a docs page, and the two standalone pages. */
const AXE_ROUTES: readonly string[] = ['/', SAMPLE_DOC, '/download', '/changelog'];
const THEMES: readonly Theme[] = ['dark', 'light'];

for (const route of AXE_ROUTES) {
  for (const theme of THEMES) {
    test(`axe: ${route} (${theme})`, async ({ page }) => {
      await withSavedTheme(page, theme);
      const response = await page.goto(routePath(route), { waitUntil: 'networkidle' });
      expect(response?.status(), `${route} must be exported`).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      const { violations } = await new AxeBuilder({ page }).analyze();
      const serious = violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );

      expect(
        serious.map(format),
        `axe found ${serious.length} serious/critical violation(s) on ${route} in ${theme}`,
      ).toEqual([]);
    });
  }
}

/**
 * The two rules that are cheap enough to check on *every* route rather than on a
 * sample: an image with no alt attribute, and a button nobody can name. Both are
 * things axe would catch, but only where axe runs.
 */
test('every image has alt text and every button has an accessible name', async ({ page }) => {
  for (const route of ALL_ROUTES) {
    const response = await page.goto(routePath(route));
    expect(response?.status(), `${route} must be exported`).toBe(200);

    const problems = await page.evaluate(() => {
      /** Text a screen reader would announce, ignoring decorative children. */
      function visibleText(element: Element): string {
        return Array.from(element.childNodes)
          .map((node) => {
            if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
            if (!(node instanceof Element)) return '';
            if (node.getAttribute('aria-hidden') === 'true') return '';
            return visibleText(node);
          })
          .join('')
          .trim();
      }

      function accessibleName(element: Element): string {
        const label = element.getAttribute('aria-label')?.trim();
        if (label) return label;

        const labelledBy = element.getAttribute('aria-labelledby');
        if (labelledBy) {
          const referenced = labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
            .join(' ')
            .trim();
          if (referenced) return referenced;
        }

        return visibleText(element) || (element.getAttribute('title')?.trim() ?? '');
      }

      const images = Array.from(document.querySelectorAll('img:not([alt])')).map((img) =>
        img.outerHTML.slice(0, 120),
      );
      const buttons = Array.from(document.querySelectorAll('button'))
        .filter((button) => accessibleName(button) === '')
        .map((button) => button.outerHTML.slice(0, 120));

      return { images, buttons };
    });

    expect(problems.images, `${route}: <img> without an alt attribute`).toEqual([]);
    expect(problems.buttons, `${route}: <button> with no accessible name`).toEqual([]);
  }
});
