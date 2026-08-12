'use client';

import { useEffect, useRef, useState } from 'react';

import type { Heading } from '@/lib/toc';

/**
 * "On this page", built from the heading tree at build time (plan §3) — the
 * links are server-rendered, so the TOC works with JS disabled.
 *
 * The only client-side part is which entry is highlighted. An IntersectionObserver
 * rather than a scroll listener: it fires on intersection changes instead of on
 * every frame of a scroll, and `setState` in its callback is a subscription to an
 * external system, which is the pattern the no-setState-in-effect rule allows.
 */
export function TocRail({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string>('');
  const seen = useRef(new Map<string, boolean>());

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          seen.current.set(entry.target.id, entry.isIntersecting);
        }
        // The topmost heading currently on screen wins; falling back to the last
        // one seen keeps a highlight while scrolling through a long section.
        const visible = headings.find((h) => seen.current.get(h.id));
        if (visible) setActive(visible.id);
      },
      // Bias the top edge past the sticky header.
      { rootMargin: '-84px 0px -60% 0px' },
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return <nav className="ws-toc" aria-label="On this page" />;

  return (
    <nav className="ws-toc" aria-label="On this page">
      <span className="ws-grplbl">On this page</span>
      {headings.map((heading) => (
        <a
          key={heading.id}
          href={`#${heading.id}`}
          data-depth={heading.depth}
          data-active={heading.id === active ? 'true' : 'false'}
        >
          {heading.text}
        </a>
      ))}
    </nav>
  );
}
