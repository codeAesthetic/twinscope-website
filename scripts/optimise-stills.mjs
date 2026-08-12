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

/**
 * Colour ladder, tried in order until the file fits.
 *
 * A screenshot of syntax-highlighted code carries far more distinct colours than
 * one of a folder tree, so a single 256-colour pass is not always enough. Fewer
 * colours on flat UI costs less than the alternative would: downscaling, which
 * makes the text in the screenshot unreadable and defeats the point of having it.
 */
const COLOUR_STEPS = [256, 192, 128, 96, 64];

let touched = 0;
const stubborn = [];

for (const name of files) {
  const file = join(stills, name);
  const before = statSync(file).size;
  if (before <= CAP) continue;

  const palette = join(stills, `.${name}.palette.png`);
  const out = join(stills, `.${name}.opt.png`);
  let best;

  try {
    for (const colours of COLOUR_STEPS) {
      ff(['-i', file, '-vf', `palettegen=max_colors=${colours}:stats_mode=full`, palette]);
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
      if (!best || after < best.size) best = { size: after, colours };
      if (after <= CAP) break;
    }

    const after = statSync(out).size;
    if (after < before) {
      renameSync(out, file);
      const note = best && best.colours !== COLOUR_STEPS[0] ? ` (${best.colours} colours)` : '';
      console.log(`[optimise-stills] ${name}: ${kb(before)} → ${kb(after)}${note}`);
      touched++;
      if (after > CAP) stubborn.push(`${name} — ${kb(after)}`);
    } else {
      rmSync(out, { force: true });
      console.warn(
        `[optimise-stills] ${name}: quantising did not help (${kb(after)}); left as is.`,
      );
      stubborn.push(`${name} — ${kb(before)}`);
    }
  } finally {
    rmSync(palette, { force: true });
    rmSync(out, { force: true });
  }
}

if (stubborn.length) {
  console.warn(
    '[optimise-stills] still over the cap; crop the capture tighter rather than downscaling:',
  );
  console.warn(stubborn.map((s) => `  ${s}`).join('\n'));
}

console.log(`[optimise-stills] ${touched} file(s) re-encoded of ${files.length}.`);
