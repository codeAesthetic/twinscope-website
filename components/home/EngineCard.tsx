import Link from 'next/link';
import type { ReactNode } from 'react';

export interface EngineCardProps {
  /** Three-or-fewer characters for the file-type badge, e.g. `TXT`. */
  badge: string;
  /** Badge hue. The one place a colour is content rather than chrome. */
  hue?: 'json' | 'dir' | 'img' | 'muted' | 'acc';
  title: string;
  /** What the engine does. Prose, not a feature list. */
  children: ReactNode;
  /** A `<MediaFigure>`, or nothing — a card reads fine without one. */
  media?: ReactNode;
  href: string;
  linkLabel: string;
  /**
   * The honest card: dashed border, no media, and a link to the issues rather
   * than to a page that would have to describe something unbuilt.
   */
  soon?: boolean;
  /** Set for links that leave the site, so they are not routed by Next. */
  external?: boolean;
}

/**
 * One engine in the landing grid.
 *
 * An `<article>` with the link inside it, not a card-sized `<a>`: a figure that
 * can play carries a `<button>`, and a button inside an anchor is invalid — the
 * mock reached the same shape.
 */
export function EngineCard({
  badge,
  hue,
  title,
  children,
  media,
  href,
  linkLabel,
  soon = false,
  external = false,
}: EngineCardProps) {
  return (
    <article className="ws-ecard" data-soon={soon ? 'true' : 'false'}>
      <span className="ws-ecard-t">
        <span className="ws-ftype" data-hue={hue ?? 'default'} aria-hidden="true">
          {badge}
        </span>
        {title}
      </span>

      <p>{children}</p>

      {media}

      {external ? (
        <a className="ws-ecard-more" href={href}>
          {linkLabel} →
        </a>
      ) : (
        <Link className="ws-ecard-more" href={href}>
          {linkLabel} →
        </Link>
      )}
    </article>
  );
}
