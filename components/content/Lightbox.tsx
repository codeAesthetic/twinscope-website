'use client';

import { createPortal } from 'react-dom';

import { useDismissible } from '@/lib/useDismissible';

export interface LightboxProps {
  src: string;
  alt: string;
  /** Intrinsic size, so the box can size itself without upscaling into mush. */
  width: number;
  height: number;
  /** Shown under the image, so the reader keeps the caption while zoomed. */
  caption?: string;
  onClose: () => void;
}

/**
 * How wide the zoomed image is allowed to be.
 *
 * Sized to the lead GIF on a docs page — the largest figure on the site and the
 * one that reads comfortably. Inline figures render at ~638px in the docs column
 * while the captures are 1000–4976px wide, so this is where detail that was
 * already in the asset finally becomes visible.
 */
const MAX_WIDTH = 1200;

/**
 * A zoomed screenshot or GIF — dismissed by Escape, by clicking outside, or by
 * the close button.
 *
 * Sizing has to survive both extremes the captures contain: a 2472×134 summary
 * strip and a 520×1506 normalisation rail. Two rules handle both:
 *
 *  - **Never upscale.** Width is capped at the asset's own pixels, so a screenshot
 *    of text is shown sharp rather than enlarged into mush. Capping at 2× natural
 *    was tried first and made the small crops worse, not better.
 *  - **Scroll rather than shrink.** An earlier `max-height: 80vh` made the tall
 *    rail *worse* than the page: it rendered 638×1848 inline and 222×640 zoomed.
 *    A tall image now keeps its width and the overlay scrolls, which is what
 *    zooming a tall product photo does anywhere else.
 */
export function Lightbox({ src, alt, width, height, caption, onClose }: LightboxProps) {
  useDismissible(onClose);

  // Never wider than the asset itself: upscaled UI text is less readable, not
  // more, and every capture worth zooming is already wider than the column.
  const cap = Math.min(MAX_WIDTH, width);

  return createPortal(
    <div
      className="ws-lightbox"
      role="presentation"
      onMouseDown={(event) => {
        // Anything that is not the image or its caption counts as outside.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button type="button" className="ws-lightbox-close" onClick={onClose} aria-label="Close">
        ✕
      </button>

      <figure
        className="ws-lightbox-fig"
        role="dialog"
        aria-modal="true"
        aria-label={alt}
        style={{ maxWidth: `${cap}px` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element --
          Same reason as MediaPlayer: a static export has no Image Optimization
          API, so next/image is a passthrough wrapper plus a client runtime. The
          asset is already loaded and cached by the inline figure this zooms. */}
        <img src={src} alt={alt} width={width} height={height} />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    </div>,
    document.body,
  );
}
