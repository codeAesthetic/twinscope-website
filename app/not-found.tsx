import type { Metadata } from 'next';
import Link from 'next/link';

import { Chip } from '@/components/content';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Page not found',
  description: `That page is not part of the ${SITE.name} documentation. Start from the docs index or the home page.`,
  // A 404 is the one page that should never be indexed, and it has no canonical
  // address of its own — every unknown URL resolves here.
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

/**
 * Exported as `404.html` by the static export, which is the file GitHub Pages
 * serves for any unknown path — so this is the real 404, not a client-side
 * fallback.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="ws-wrap">
        <div className="ws-page" data-narrow="true">
          <Chip tone="mod">404</Chip>

          <h1>That page is not here</h1>

          <p className="ws-page-lede">
            The link may be from an older layout, or a typo. Nothing was deleted — this site
            documents one version of {SITE.name}, so every page it has ever had is still in the
            docs.
          </p>

          <div className="ws-hero-cta" style={{ justifyContent: 'flex-start' }}>
            <Link
              className="ws-btn"
              data-variant="primary"
              href="/docs/getting-started/what-is-twinscope"
            >
              Read the docs
            </Link>
            <Link className="ws-btn" href="/">
              Back to the home page
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
