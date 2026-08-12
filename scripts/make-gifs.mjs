/**
 * Turns the capture harness's webm clips into the GIFs and posters the site ships
 * (plan W5, W5a).
 *
 * The webm is an intermediate — Playwright records nothing else — and is never
 * committed. Each clip carries a sidecar JSON with the trim points and crop the
 * capture spec decided, so timing lives with the capture rather than here.
 *
 * Per clip this produces:
 *   public/media/gifs/<id>.gif     1000 px · 12 fps · ≤ 10 s · ≤ 2 MB
 *   public/media/stills/<id>.png   the first frame of the trimmed range — the
 *                                  poster the page renders until a reader presses
 *                                  play, and free rather than captured twice
 *
 * Encoding is a two-pass palette: one global palette for the whole clip, then
 * paletteuse. A per-frame palette would look better in isolation and flicker
 * horribly across frames, which is the classic GIF mistake.
 *
 * If a clip lands over budget, colours are reduced before frame rate: banding on
 * flat UI panels is far less noticeable than a stuttering cursor.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const appRoot = process.env.TWINSCOPE_APP ?? resolve(root, '..', 'project_dev_diff');
const clipsDir = join(appRoot, 'e2e', '.artifacts', 'media', 'clips');

const gifsOut = join(root, 'public', 'media', 'gifs');
const stillsOut = join(root, 'public', 'media', 'stills');

const WIDTH = 1000;
const FPS = 12;
const MAX_SECONDS = 10;
const MAX_BYTES = 2 * 1024 * 1024;
/** Colour ladder, tried in order until the clip fits the budget. */
const COLOUR_STEPS = [256, 192, 128, 96, 64];

const kb = (n) => `${Math.round(n / 1024)} KB`;
const ff = (args) =>
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });

if (!existsSync(clipsDir)) {
  console.log(`[make-gifs] no clips at ${clipsDir} — nothing to convert.`);
  process.exit(0);
}

mkdirSync(gifsOut, { recursive: true });
mkdirSync(stillsOut, { recursive: true });

const ids = readdirSync(clipsDir).filter((d) => statSync(join(clipsDir, d)).isDirectory());
if (ids.length === 0) {
  console.log('[make-gifs] clips directory is empty.');
  process.exit(0);
}

let made = 0;
const over = [];

for (const id of ids) {
  const dir = join(clipsDir, id);
  const webm = join(dir, `${id}.webm`);
  const metaFile = join(dir, `${id}.json`);
  if (!existsSync(webm)) {
    console.warn(`[make-gifs] ${id}: no webm, skipped.`);
    continue;
  }

  const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
  const startS = (meta.startMs ?? 0) / 1000;
  const endS = meta.endMs ? meta.endMs / 1000 : undefined;
  const duration = Math.min(endS ? endS - startS : MAX_SECONDS, MAX_SECONDS);

  // Crop first, then scale: the capture spec chose cropHeight to cut the window
  // chrome, and scaling before cropping would make that number meaningless.
  const crop = meta.cropHeight ? `crop=${meta.width ?? 'iw'}:${meta.cropHeight}:0:0,` : '';
  const chain = `${crop}fps=${FPS},scale=${WIDTH}:-2:flags=lanczos`;

  const gif = join(gifsOut, `${id}.gif`);
  const poster = join(stillsOut, `${id}.png`);
  const palette = join(gifsOut, `.${id}.palette.png`);
  const trim = ['-ss', String(startS), '-t', String(duration)];

  try {
    // Poster: the first frame of the trimmed range, same crop, full resolution.
    ff([
      ...trim,
      '-i',
      webm,
      '-vf',
      crop ? crop.replace(/,$/, '') : 'null',
      '-frames:v',
      '1',
      poster,
    ]);

    let size = Infinity;
    for (const colours of COLOUR_STEPS) {
      ff([
        ...trim,
        '-i',
        webm,
        '-vf',
        `${chain},palettegen=max_colors=${colours}:stats_mode=diff`,
        palette,
      ]);
      ff([
        ...trim,
        '-i',
        webm,
        '-i',
        palette,
        '-lavfi',
        `${chain}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle`,
        '-loop',
        '0',
        gif,
      ]);
      size = statSync(gif).size;
      if (size <= MAX_BYTES) {
        console.log(
          `[make-gifs] ${id}: ${kb(size)}, ${duration.toFixed(1)}s, ${colours} colours` +
            (colours === COLOUR_STEPS[0] ? '' : ' (reduced to fit the budget)'),
        );
        break;
      }
    }

    if (size > MAX_BYTES) {
      over.push(`${id} — ${kb(size)}`);
      console.warn(`[make-gifs] ${id}: still ${kb(size)} at ${COLOUR_STEPS.at(-1)} colours.`);
    }
    made++;
  } finally {
    rmSync(palette, { force: true });
  }
}

console.log(`[make-gifs] ${made} clip(s) converted.`);
if (over.length) {
  console.error('[make-gifs] over the 2 MB cap — shorten the capture rather than raising the cap:');
  console.error(over.map((o) => `  ${o}`).join('\n'));
  process.exit(1);
}
