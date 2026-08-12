'use client';

import Link from 'next/link';
import { useState } from 'react';

import { NAV } from '@/content/nav';

/**
 * Groups come from `content/nav.ts`, which the pager and
 * `generateStaticParams` also read — so the sidebar cannot list a page that
 * does not exist, or miss one that does.
 *
 * Client-side only for the mobile disclosure. On desktop the `data-open`
 * attribute is inert; CSS ignores it above 760px.
 */
export function DocsSidebar({ current }: { current: string }) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="ws-docnav" aria-label="Documentation" data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className="ws-docnav-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? '▾' : '▸'} All pages
      </button>

      <div className="ws-docnav-groups">
        {NAV.map((group) => (
          <div className="ws-docnav-grp" key={group.label}>
            <span className="ws-grplbl">{group.label}</span>
            {group.items.map((item) => (
              <Link
                key={item.slug}
                href={`/docs/${item.slug}`}
                aria-current={item.slug === current ? 'page' : undefined}
              >
                {item.short ?? item.title}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}
