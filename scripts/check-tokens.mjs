/**
 * Fails when our token values drift from the app's (plan W3).
 *
 * The website is TwinScope's second surface; a --acc that disagrees with the app
 * is a bug, and the only way that stays true is a machine check.
 *
 * Compares *values*, not bytes: `sync-tokens.mjs` strips the app's Tailwind
 * `@theme inline` bridge, which this site has no use for. Every real token —
 * dark and light — still has to match exactly.
 *
 * Skips cleanly when the app checkout is not a sibling directory, so CI never
 * depends on one being present. Set TWINSCOPE_APP to point elsewhere.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ours = join(here, '..', 'styles', 'tokens.css');
const appRoot = process.env.TWINSCOPE_APP ?? resolve(here, '..', '..', 'project_dev_diff');
const theirs = join(appRoot, 'src', 'renderer', 'src', 'styles', 'tokens.css');

if (!existsSync(theirs)) {
  console.log(`[check-tokens] app checkout not found at ${appRoot} — skipping.`);
  console.log('[check-tokens] set TWINSCOPE_APP=<path> to compare.');
  process.exit(0);
}

/**
 * Custom properties per selector block, skipping `@theme` (Tailwind-only).
 * Returns Map<selector, Map<prop, value>>.
 */
function tokensBySelector(source) {
  // Comments first: otherwise a file header is parsed as part of the `:root`
  // selector and every block reads as missing.
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = new Map();
  // No `}` anchor: consuming the closing brace of one block would make the next
  // selector unmatchable, which silently skipped the whole light-theme block.
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim().replace(/\s+/g, ' ');
    if (!selector || selector.startsWith('@')) continue;
    const props = new Map(
      [...match[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((p) => [
        p[1],
        p[2].trim().replace(/\s+/g, ' '),
      ]),
    );
    if (props.size) blocks.set(selector, props);
  }
  return blocks;
}

/**
 * The app defines a dark block and a light block. If we ever parse fewer, the
 * parser broke — and a check that silently compares half the tokens is worse
 * than no check, because it still prints a pass.
 */
const MIN_BLOCKS = 2;

const mine = tokensBySelector(readFileSync(ours, 'utf8'));
const app = tokensBySelector(readFileSync(theirs, 'utf8'));

if (app.size < MIN_BLOCKS) {
  console.error(
    `[check-tokens] parsed only ${app.size} block(s) from the app's tokens.css — expected at least ${MIN_BLOCKS}.`,
  );
  console.error('This is a bug in this script, not a token drift. Fix the parser.');
  process.exit(1);
}

// Site-only tokens belong in site-tokens.css, so anything here must exist there.
const problems = [];

for (const [selector, appProps] of app) {
  const myProps = mine.get(selector);
  if (!myProps) {
    problems.push(`  missing block: ${selector}`);
    continue;
  }
  for (const [prop, value] of appProps) {
    if (!myProps.has(prop)) problems.push(`  ${selector} → missing ${prop}: ${value}`);
    else if (myProps.get(prop) !== value) {
      problems.push(`  ${selector} → ${prop}: ours=${myProps.get(prop)} app=${value}`);
    }
  }
  for (const prop of myProps.keys()) {
    if (!appProps.has(prop)) {
      problems.push(
        `  ${selector} → ${prop} is not in the app; site-only tokens go in site-tokens.css`,
      );
    }
  }
}

if (problems.length) {
  console.error('[check-tokens] token values have drifted from the app:');
  console.error(problems.join('\n'));
  console.error('\nFix: npm run sync:tokens');
  process.exit(1);
}

const count = [...mine.values()].reduce((n, props) => n + props.size, 0);
console.log(`[check-tokens] ${count} tokens across ${mine.size} blocks match the app.`);
