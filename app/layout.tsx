import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SITE, SITE_URL, absoluteUrl } from '@/lib/site';

import '@/styles/tokens.css';
import '@/styles/site-tokens.css';
import '@/styles/base.css';
import '@/styles/primitives.css';
import '@/styles/layout.css';
import '@/styles/content.css';
import '@/styles/docs.css';
import '@/styles/home.css';

/**
 * `metadataBase` is what makes canonical and OG URLs absolute (plan W18).
 * Without it Next emits relative ones, and a relative canonical on a project
 * Pages site resolves against the wrong root.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description:
    'TwinScope is a local-first desktop app that compares files, folders, JSON and images, ' +
    'picks the right diff engine automatically, and explains what changed. No account, no telemetry.',
  applicationName: SITE.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    url: absoluteUrl('/'),
    title: `${SITE.name} — ${SITE.tagline}`,
  },
  robots: { index: true, follow: true },
};

/**
 * Sets the theme before first paint so a dark-default site never flashes white.
 * Inline and synchronous by necessity — anything deferred is a flash.
 */
const THEME_BOOTSTRAP = `
(function () {
  try {
    var saved = localStorage.getItem('twinscope-theme');
    var theme = saved === 'light' || saved === 'dark'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`.trim();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <a className="ws-skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
