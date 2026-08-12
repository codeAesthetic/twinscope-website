import Link from 'next/link';

import { neighbours } from '@/content/nav';

/** Reads the same ordering as the sidebar, so they cannot disagree. */
export function Pager({ current }: { current: string }) {
  const { prev, next } = neighbours(current);
  if (!prev && !next) return null;

  return (
    <nav className="ws-pager" aria-label="Previous and next page">
      {prev ? (
        <Link href={`/docs/${prev.slug}`} data-dir="prev">
          <small>← Previous</small>
          {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/docs/${next.slug}`} data-dir="next">
          <small>Next →</small>
          {next.title}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
