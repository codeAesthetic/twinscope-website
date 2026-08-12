import type { MetadataRoute } from 'next';

import { FLAT_NAV } from '@/content/nav';
import { absoluteUrl } from '@/lib/site';

/**
 * A static export has no server to regenerate this, so the route must be
 * explicitly static — Next refuses to collect it otherwise.
 */
export const dynamic = 'force-static';

/**
 * Every route on the site, absolute (plan W18).
 *
 * The docs pages come from `FLAT_NAV` rather than a second list, for the same
 * reason the sidebar and the pager do: a page added to nav.ts and forgotten here
 * would be invisible to a crawler, and nothing would fail. `generateStaticParams`
 * reads the same list, so what is exported and what is listed cannot diverge.
 *
 * `/kitchen-sink` is deliberately absent (it is a component gallery, not a page
 * anyone should land on) — and it stays absent because this file enumerates
 * routes rather than walking the output directory.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/'), priority: 1, changeFrequency: 'monthly' },
    { url: absoluteUrl('/download'), priority: 0.9, changeFrequency: 'monthly' },
    { url: absoluteUrl('/changelog'), priority: 0.8, changeFrequency: 'monthly' },
    ...FLAT_NAV.map((item) => ({
      url: absoluteUrl(`/docs/${item.slug}`),
      priority: 0.7,
      changeFrequency: 'monthly' as const,
    })),
  ];
}
