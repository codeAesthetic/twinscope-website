'use client';

import { useEffect } from 'react';

/**
 * The two things every overlay on this site kept getting wrong.
 *
 * Extracted after the search palette shipped with both bugs: Escape was bound to
 * a text field, so it died as soon as focus moved, and the page kept scrolling
 * behind the modal. Both are properties of *being an overlay*, not of any one
 * overlay, so they live here and the lightbox inherits them rather than
 * rediscovering them.
 *
 * Escape listens on the document in the **capture** phase, so it fires wherever
 * focus happens to be — including `<body>` after a stray click.
 *
 * Note the other half of the lesson, which a hook cannot enforce: an overlay must
 * also be portalled to `<body>`. The site header carries `backdrop-filter`, which
 * makes it a containing block for fixed-position descendants, so a `fixed` scrim
 * rendered inside it covers the header instead of the viewport.
 */
export function useDismissible(onDismiss: () => void): void {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDismiss();
      }
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onDismiss]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
}
