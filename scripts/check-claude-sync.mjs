/**
 * Fails when the SHARED block in the two CLAUDE.md files has drifted apart.
 *
 * The two files describe genuinely different projects — an Electron app and a
 * static site — so making them identical would be worse than useless. What must
 * not drift is the handful of facts that span both: commit identity, which files
 * are gitignored, which direction tokens flow, who owns the media pipeline, the
 * released version. Those live in one delimited block that is byte-identical in
 * each, and this check is what makes "in sync" a fact rather than an intention.
 *
 * Same shape as check-tokens.mjs: skips cleanly when the app checkout is not a
 * sibling directory, so CI never depends on one being present. Both CLAUDE.md
 * files are gitignored, so this is a local check by nature — which is fine,
 * because drift only happens where both files are being edited.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ours = join(here, '..', 'CLAUDE.md');
const appRoot = process.env.TWINSCOPE_APP ?? resolve(here, '..', '..', 'project_dev_diff');
const theirs = join(appRoot, 'CLAUDE.md');

const BEGIN = '<!-- SHARED:BEGIN';
const END = '<!-- SHARED:END -->';

/** Returns the block body, or a reason it could not be read. */
function sharedBlock(file, label) {
  if (!existsSync(file)) return { error: `${label}: no CLAUDE.md at ${file}` };
  const text = readFileSync(file, 'utf8');

  const start = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  if (start < 0 || end < 0) return { error: `${label}: no SHARED block (${BEGIN} … ${END})` };
  if (end < start) return { error: `${label}: SHARED:END appears before SHARED:BEGIN` };

  // From the end of the opening comment to the start of the closing one, so the
  // marker comments themselves may carry different wording.
  const openEnd = text.indexOf('-->', start);
  if (openEnd < 0 || openEnd > end) return { error: `${label}: unterminated SHARED:BEGIN comment` };

  return { body: text.slice(openEnd + 3, end).trim() };
}

if (!existsSync(theirs)) {
  console.log(`[check-claude-sync] app CLAUDE.md not found at ${theirs} — skipping.`);
  console.log('[check-claude-sync] set TWINSCOPE_APP=<path> to compare.');
  process.exit(0);
}

const mine = sharedBlock(ours, 'website');
const app = sharedBlock(theirs, 'app');

for (const side of [mine, app]) {
  if (side.error) {
    console.error(`[check-claude-sync] ${side.error}`);
    process.exit(1);
  }
}

if (mine.body === app.body) {
  const lines = mine.body.split('\n').length;
  console.log(`[check-claude-sync] SHARED block matches — ${lines} lines in both.`);
  process.exit(0);
}

// Report the first differing line rather than dumping both blocks.
const a = mine.body.split('\n');
const b = app.body.split('\n');
const at = a.findIndex((line, i) => line !== b[i]);

console.error('[check-claude-sync] the SHARED block has drifted.');
if (at >= 0) {
  console.error(`  first difference at line ${at + 1} of the block:`);
  console.error(`    website: ${a[at] ?? '(missing)'}`);
  console.error(`    app:     ${b[at] ?? '(missing)'}`);
}
if (a.length !== b.length) {
  console.error(`  length differs: website ${a.length} lines, app ${b.length}`);
}
console.error('\nThe block is one contract in two files. Update both, or neither.');
process.exit(1);
