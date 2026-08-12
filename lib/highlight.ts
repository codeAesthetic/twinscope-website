import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

/**
 * Build-time syntax highlighting (plan W8), shiki 4.4.3 — the app's exact
 * version, so code on this site tokenises identically to code in the app.
 *
 * Two deliberate choices carried over from the app:
 *
 *  - **The JavaScript regex engine, not oniguruma.** The app needs it because
 *    oniguruma is WASM and the packaged renderer loads from `file://`. Here it
 *    simply avoids shipping a WASM binary through a static export for no gain.
 *  - **Dual theme.** One pass emits `--shiki-light` / `--shiki-dark` custom
 *    properties per token, and two CSS rules pick a side. The alternative is
 *    two stylesheets, or highlighting twice.
 *
 * The highlighter is created once per build and reused; creating one per code
 * block would load every grammar again for each snippet.
 */
type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;

const LANGS = {
  ts: () => import('@shikijs/langs/typescript'),
  tsx: () => import('@shikijs/langs/tsx'),
  js: () => import('@shikijs/langs/javascript'),
  json: () => import('@shikijs/langs/json'),
  bash: () => import('@shikijs/langs/bash'),
  css: () => import('@shikijs/langs/css'),
  diff: () => import('@shikijs/langs/diff'),
  yaml: () => import('@shikijs/langs/yaml'),
  md: () => import('@shikijs/langs/markdown'),
  html: () => import('@shikijs/langs/html'),
} as const;

/** Aliases a writer will reasonably type in a fence. */
const ALIAS: Record<string, keyof typeof LANGS> = {
  typescript: 'ts',
  javascript: 'js',
  shell: 'bash',
  sh: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  markdown: 'md',
  jsonc: 'json',
};

let instance: Promise<Highlighter> | undefined;

function highlighter(): Promise<Highlighter> {
  instance ??= createHighlighterCore({
    themes: [
      import('@shikijs/themes/github-dark-default'),
      import('@shikijs/themes/github-light-default'),
    ],
    langs: Object.values(LANGS),
    engine: createJavaScriptRegexEngine(),
  });
  return instance;
}

function resolveLang(lang: string): keyof typeof LANGS | 'text' {
  const key = lang.toLowerCase();
  if (key in LANGS) return key as keyof typeof LANGS;
  if (key in ALIAS) return ALIAS[key];
  return 'text';
}

/**
 * Returns `<pre>…</pre>`. An unsupported language falls back to plain text
 * rather than throwing — the same tolerance the app's highlighter has, because a
 * docs build should not fail over a fence label.
 */
export async function highlight(code: string, lang: string): Promise<string> {
  const resolved = resolveLang(lang);

  if (resolved === 'text') {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre tabindex="0"><code>${escaped}</code></pre>`;
  }

  const shiki = await highlighter();
  return shiki.codeToHtml(code, {
    lang: resolved,
    // `defaultColor: false` is what makes it emit both palettes as custom
    // properties instead of committing to one. shiki also adds tabindex="0", so
    // a keyboard user can scroll a wide block.
    themes: { light: 'github-light-default', dark: 'github-dark-default' },
    defaultColor: false,
  });
}
