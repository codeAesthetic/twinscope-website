'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { FLAT_NAV, groupOf } from '@/content/nav';

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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => (results.length ? (c + 1) % results.length : 0));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0));
    }
    if (event.key === 'Enter') {
      const chosen = results[Math.min(cursor, results.length - 1)];
      if (chosen) {
        router.push(`/docs/${chosen.item.slug}`);
        onClose();
      }
    }
  }

  return (
    <div
      className="ws-scrim"
      role="presentation"
      onClick={(event) => {
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
            onKeyDown={onKeyDown}
            placeholder="Search pages…"
            aria-label="Search pages"
          />
          <kbd className="ws-kbd">Esc</kbd>
        </div>

        {results.length === 0 ? (
          <p className="ws-palette-empty">No page matches “{query}”.</p>
        ) : (
          <ul className="ws-palette-list">
            {results.map((row, index) => (
              <li key={row.item.slug}>
                <a
                  href={`/docs/${row.item.slug}`}
                  data-selected={index === Math.min(cursor, results.length - 1) ? 'true' : 'false'}
                  onMouseEnter={() => setCursor(index)}
                  onClick={onClose}
                >
                  <b>{row.item.title}</b>
                  <span className="ws-palette-sub">{row.group}</span>
                </a>
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
    </div>
  );
}
