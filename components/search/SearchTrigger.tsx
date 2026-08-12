'use client';

import { useEffect, useState } from 'react';

import { SearchDialog } from './SearchDialog';

/**
 * The ⌘K affordance, mirroring the app's own palette.
 *
 * The dialog is mounted only once opened, so its index code never loads for a
 * reader who does not search.
 */
export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button type="button" className="ws-searchpill" onClick={() => setOpen(true)}>
        <span aria-hidden="true">⌕</span>
        <span>Search docs…</span>
        <kbd className="ws-kbd">⌘K</kbd>
      </button>
      {open ? <SearchDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}
