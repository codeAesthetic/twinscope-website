'use client';

import { useCallback, useSyncExternalStore } from 'react';

type Theme = 'dark' | 'light';

const KEY = 'twinscope-theme';

/**
 * Dark ↔ light, persisted.
 *
 * The theme lives on <html data-theme>, written by the bootstrap script in
 * layout.tsx before first paint. This component therefore *subscribes* to the
 * DOM rather than keeping its own copy: mirroring it into state would need a
 * setState inside an effect, which lint rejects (cascading renders — the same
 * rule the app repo enforces), and two sources of truth is how a theme flashes.
 *
 * A MutationObserver rather than a click handler, so the label stays correct if
 * anything else ever changes the theme.
 */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** Dark is the default, so that is what the exported HTML says. */
function getServerSnapshot(): Theme {
  return 'dark';
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = getSnapshot() === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private browsing denies writes; the toggle still works for this visit.
    }
  }, []);

  return (
    <button
      type="button"
      className="ws-iconbtn"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      data-theme-state={theme}
    >
      ◐
    </button>
  );
}
