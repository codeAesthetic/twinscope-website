/**
 * Copies the app's tokens.css into styles/tokens.css, minus the Tailwind bridge.
 *
 * The app ends its token file with an `@theme inline { --color-*: var(--*) }`
 * block that exposes tokens to Tailwind v4 utilities. This site has no Tailwind
 * (plan W10), so that block is dead weight here — and Next's CSS pipeline warns
 * about the unknown at-rule on every build, which is how a project learns to
 * ignore its own warnings.
 *
 * What must not drift is the token *values*, and `check-tokens.mjs` compares
 * those directly. Run this rather than hand-editing the copy.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dest = join(here, '..', 'styles', 'tokens.css');
const appRoot = process.env.TWINSCOPE_APP ?? resolve(here, '..', '..', 'project_dev_diff');
const source = join(appRoot, 'src', 'renderer', 'src', 'styles', 'tokens.css');

if (!existsSync(source)) {
  console.error(`[sync-tokens] app tokens not found at ${source}`);
  console.error('[sync-tokens] set TWINSCOPE_APP=<path to the app checkout>.');
  process.exit(1);
}

/** Strips the `@theme inline { … }` block and the comment introducing it. */
export function stripTailwindBridge(css) {
  return css
    .replace(/\/\*[^*]*Tailwind[\s\S]*?\*\/\s*/g, '')
    .replace(/@theme\s+inline\s*\{[\s\S]*?\n\}\s*/g, '')
    .trimEnd()
    .concat('\n');
}

const banner = `/*
 * Copied from the app by \`npm run sync:tokens\` — do not hand-edit (plan W3).
 * The app's Tailwind \`@theme inline\` block is stripped: this site has no
 * Tailwind. Site-only tokens live in site-tokens.css.
 *
 * Source: src/renderer/src/styles/tokens.css
 */
`;

const body = stripTailwindBridge(readFileSync(source, 'utf8'))
  // Drop the app's own file header; ours replaces it.
  .replace(/^\/\*[\s\S]*?\*\/\s*/, '');

writeFileSync(dest, banner + body);
console.log(`[sync-tokens] wrote styles/tokens.css from ${source}`);
