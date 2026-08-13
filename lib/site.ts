/**
 * One place for facts about where this site lives.
 *
 * `BASE_PATH` is duplicated from next.config.ts on purpose: config cannot be
 * imported into the app graph, and a wrong value here produces broken canonical
 * URLs rather than a build error. The regression spec asserts they agree.
 */
export const BASE_PATH = '/twinscope-website';

/** Absolute origin of the deployed site, used for canonical and OG URLs (W18). */
export const SITE_ORIGIN = 'https://codeaesthetic.github.io';

export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}`;

export const SITE = {
  name: 'TwinScope',
  tagline: 'Compare anything. Understand what changed.',
  /** The app version this site documents (plan W9). One version, on purpose. */
  documentsVersion: '0.3.9',
  repo: 'https://github.com/codeAesthetic/twinscope',
  websiteRepo: 'https://github.com/codeAesthetic/twinscope-website',
} as const;

/** Absolute URL for a route path such as `/docs/engines/text`. */
export function absoluteUrl(path: string): string {
  const clean = path === '/' ? '/' : `/${path.replace(/^\/|\/$/g, '')}/`;
  return `${SITE_URL}${clean === '/' ? '/' : clean}`;
}
