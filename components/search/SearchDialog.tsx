'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { FLAT_NAV, groupOf } from '@/content/nav';
import { useDismissible } from '@/lib/useDismissible';

/**
 * Page search over `nav.ts`, with the app's palette behaviour: a fuzzy
 * subsequence filter, ↑↓ to move, ⏎ to open, Esc to close.
 *
 * Titles only, deliberately — full-text search is WEB-6 and droppable (W16).
 * This is the part that is free: 30 titles are already in the bundle, so it costs
 * no index, no WASM and no request.
 */
function fuzzyScore(haystack: string, needle: string): number | undefined {
  if (!needle) return 0;
  const text = haystack.toLowerCase();
  const query = needle.toLowerCase();

  let index = 0;
  let score = 0;
  let lastHit = -1;

  for (const char of query) {
    const hit = text.indexOf(char, index);
    if (hit < 0) return undefined;
    // Adjacent matches score better than scattered ones, so "keymap" ranks
    // "Keyboard map" above a page that merely contains those letters.
    score += hit === lastHit + 1 ? 0 : hit - index + 1;
    lastHit = hit;
    index = hit + 1;
  }
  return score;
}

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    return FLAT_NAV.map((item) => {
      const group = groupOf(item.slug)?.label ?? '';
      const score = fuzzyScore(`${item.title} ${group}`, query);
      return score === undefined ? undefined : { item, group, score };
    })
      .filter((row): row is { item: (typeof FLAT_NAV)[number]; group: string; score: number } =>
        Boolean(row),
      )
      .sort((a, b) => a.score - b.score)
      .slice(0, 8);
  }, [query]);

  const selected = Math.min(cursor, Math.max(results.length - 1, 0));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape-anywhere and the background scroll lock are shared with the lightbox;
  // both were bugs here first. See lib/useDismissible.ts.
  useDismissible(onClose);

  const go = useCallback(
    (slug: string) => {
      router.push(`/docs/${slug}`);
      onClose();
    },
    [router, onClose],
  );

  function onInputKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => (results.length ? (c + 1) % results.length : 0));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = results[selected];
      if (chosen) go(chosen.item.slug);
    }
  }

  /*
   * Portalled to <body>, which is the whole fix for click-outside.
   *
   * The dialog is rendered by the search button, which lives in the site header —
   * and the header carries `backdrop-filter: blur(12px)`. A filter or
   * backdrop-filter makes an element a **containing block for fixed-position
   * descendants**, so `position: fixed; inset: 0` resolved against the header
   * rather than the viewport: the scrim measured 1280×86. Nothing below the header
   * could receive the click meant to dismiss it, and the page was never dimmed.
   * Moving the node out of that subtree makes `fixed` mean fixed again.
   */
  return createPortal(
    <div
      className="ws-scrim"
      role="presentation"
      onMouseDown={(event) => {
        // mousedown rather than click: a press that starts on the scrim and ends
        // on the palette — a drag, or a text selection that overshoots — should
        // still count as outside, and this fires before focus moves.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ws-palette" role="dialog" aria-modal="true" aria-label="Search docs">
        <div className="ws-palette-in">
          <span aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search pages…"
            aria-label="Search pages"
          />
          {/* The Esc hint was a decorative <kbd>. It is the most obvious thing to
              click when you want out, so it is a real button. */}
          <button
            type="button"
            className="ws-palette-esc"
            onClick={onClose}
            aria-label="Close search"
          >
            Esc
          </button>
        </div>

        {results.length === 0 ? (
          <p className="ws-palette-empty">No page matches “{query}”.</p>
        ) : (
          <ul className="ws-palette-list">
            {results.map((row, index) => (
              <li key={row.item.slug}>
                {/* next/link, not a bare <a>: a raw href skips basePath, so on
                    Pages every result resolved to /docs/… at the domain root —
                    a 404 for every reader, invisible in local dev at /. */}
                <Link
                  href={`/docs/${row.item.slug}`}
                  data-selected={index === selected ? 'true' : 'false'}
                  onMouseEnter={() => setCursor(index)}
                  onClick={onClose}
                >
                  <b>{row.item.title}</b>
                  <span className="ws-palette-sub">{row.group}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="ws-palette-ft">
          <span>↑↓ navigate</span>
          <span>⏎ open</span>
          <span>Esc close</span>
          <span className="ws-spacer">Page titles</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
