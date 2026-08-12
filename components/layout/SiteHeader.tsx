import Link from 'next/link';

import { SearchTrigger } from '@/components/search/SearchTrigger';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SITE } from '@/lib/site';

const LINKS = [
  { href: '/docs/getting-started/what-is-twinscope', label: 'Docs', match: '/docs' },
  { href: '/download', label: 'Download', match: '/download' },
  { href: '/changelog', label: 'Changelog', match: '/changelog' },
] as const;

/**
 * `current` is passed in rather than read from a hook, so the header stays a
 * server component — `usePathname` would drag the whole thing (and the nav) to
 * the client for a string every page already knows.
 */
export function SiteHeader({ current = '' }: { current?: string }) {
  return (
    <header className="ws-hd">
      <div className="ws-wrap">
        <Link className="ws-brand" href="/">
          <span className="ws-logo" aria-hidden="true" />
          {SITE.name}
          <span className="ws-ver">{SITE.documentsVersion}</span>
        </Link>

        <nav className="ws-nav" aria-label="Main">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current.startsWith(link.match) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ws-hd-right">
          <SearchTrigger />
          <ThemeToggle />
          <a
            className="ws-iconbtn"
            href={SITE.repo}
            title="TwinScope on GitHub"
            aria-label="TwinScope on GitHub"
          >
            ↗
          </a>
        </div>
      </div>
    </header>
  );
}
