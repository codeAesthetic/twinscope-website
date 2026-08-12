import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

/**
 * A static export has no server to regenerate this, so the route must be
 * explicitly static — Next refuses to collect it otherwise.
 */
export const dynamic = 'force-static';

/**
 * Everything is crawlable — there is nothing here to hide, and a docs site that
 * blocks crawlers is a docs site nobody finds.
 *
 * Worth knowing about a *project* Pages site: this file is served at
 * `/twinscope-website/robots.txt`, and crawlers only read `/robots.txt` at the
 * origin root, which this repo does not own. So it is advisory today and becomes
 * authoritative the moment a custom domain lands (plan W7). The sitemap URL is
 * absolute for exactly that reason — it can be submitted directly, base path and
 * all, without anything at the root cooperating.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
