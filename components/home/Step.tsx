import type { ReactNode } from 'react';

/**
 * One numbered step in the landing page's "how it works" strip.
 *
 * `title` is a node rather than a string because two of the three steps name a
 * key in their heading, and a `<Kbd>` is part of the heading, not decoration
 * bolted on after it.
 */
export function Step({ n, title, children }: { n: number; title: ReactNode; children: ReactNode }) {
  return (
    <div className="ws-step">
      <span className="ws-step-n" aria-hidden="true">
        {n}
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
