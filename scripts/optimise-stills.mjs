/**
 * Brings oversized stills under the per-file cap (plan W11).
 *
 * App screenshots are flat UI: large areas of a few panel colours, plus
 * antialiased text. A 256-colour palette is therefore close to lossless here and
 * roughly halves the file, where raw PNG compression saves nothing (the capture
 * is already deflate-compressed — re-encoding at maximum effort made one file
 * *bigger*).
 *
 * Dithering is off deliberately: dither on flat panels adds noise that costs
 * more bytes than the banding it hides, and on a UI screenshot there are no
 * gradients wide enough to band.
 *
 * Only files over the cap are touched, so a capture that is already small keeps
 * its full colour. Idempotent: running twice re-quantises an already-quantised
 * file to the same result.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const stills = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'media', 'stills');
const CAP = 300 * 1024;
const kb = (n) => `${Math.round(n / 1024)} KB`;

let files;
try {
  files = readdirSync(stills).filter((f) => f.endsWith('.png'));
} catch {
  console.log('[optimise-stills] no stills yet.');
  process.exit(0);
}

const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);

let touched = 0;
for (const name of files) {
  const file = join(stills, name);
  const before = statSync(file).size;
  if (before <= CAP) continue;

  const palette = join(stills, `.${name}.palette.png`);
  const out = join(stills, `.${name}.opt.png`);

  try {
    ff(['-i', file, '-vf', 'palettegen=max_colors=256:stats_mode=full', palette]);
    ff([
      '-i',
      file,
      '-i',
      palette,
      '-lavfi',
      'paletteuse=dither=none',
      '-compression_level',
      '100',
      out,
    ]);

    const after = statSync(out).size;
    if (after < before) {
      renameSync(out, file);
      console.log(`[optimise-stills] ${name}: ${kb(before)} → ${kb(after)}`);
      touched++;
    } else {
      rmSync(out, { force: true });
      console.warn(
        `[optimise-stills] ${name}: quantising did not help (${kb(after)}); left as is.`,
      );
    }
  } finally {
    rmSync(palette, { force: true });
    rmSync(out, { force: true });
  }
}

console.log(`[optimise-stills] ${touched} file(s) re-encoded of ${files.length}.`);
