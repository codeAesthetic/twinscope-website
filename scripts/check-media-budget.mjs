/**
 * Enforces the asset budget (plan W11): PNG ≤ 300 KB, GIF ≤ 2 MB,
 * public/media total ≤ 30 MB.
 *
 * Committed binaries are forever, and GIF-only makes the heavy format the
 * primary one. A budget checked by CI is the only version of this rule that
 * survives contact with a deadline.
 *
 * Passes on an empty tree so this can land before MEDIA-1 does.
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const media = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'media');

const PER_FILE = { '.png': 300 * 1024, '.gif': 2 * 1024 * 1024, '.svg': 100 * 1024 };
const TOTAL = 30 * 1024 * 1024;
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

if (!existsSync(media)) {
  console.log('[check-media] no public/media yet — nothing to weigh.');
  process.exit(0);
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(media);
const oversize = [];
let total = 0;

for (const file of files) {
  const { size } = statSync(file);
  total += size;
  const cap = PER_FILE[extname(file).toLowerCase()];
  if (cap && size > cap) {
    oversize.push(`  ${relative(media, file)} — ${kb(size)}, cap ${kb(cap)}`);
  }
}

const problems = [];
if (oversize.length)
  problems.push(`${oversize.length} file(s) over the per-file cap:\n${oversize.join('\n')}`);
if (total > TOTAL) problems.push(`total ${mb(total)} exceeds the ${mb(TOTAL)} budget`);

if (problems.length) {
  console.error('[check-media] budget exceeded.');
  console.error(problems.join('\n'));
  console.error('\nW11: re-encode (12 fps, 1000 px, ≤ 10 s) rather than raising the cap.');
  console.error('Crossing the total is a conversation, not a bump.');
  process.exit(1);
}

console.log(`[check-media] ${files.length} asset(s), ${mb(total)} of ${mb(TOTAL)}.`);
