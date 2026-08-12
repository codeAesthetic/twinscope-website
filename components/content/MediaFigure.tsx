import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ReactNode } from 'react';

import { MediaPlayer } from './MediaPlayer';
import { BASE_PATH } from '@/lib/site';

export interface MediaFigureProps {
  /** Asset id, e.g. `json-tree` or `R1-json-normalisation`. */
  id: string;
  /** Alt text. Say what changed, not "screenshot of TwinScope". */
  alt: string;
  caption?: ReactNode;
  /** Declare that this figure has an animated version. */
  gif?: boolean;
  /**
   * Intrinsic size. Normally read from the PNG itself — pass these only to
   * override.
   */
  width?: number;
  height?: number;
  /** Skip lazy loading for the one figure above the fold. */
  priority?: boolean;
}

const PUBLIC_DIR = join(process.cwd(), 'public');

/**
 * Reads a PNG's real dimensions from its IHDR chunk.
 *
 * Hard-coded defaults were wrong and silently so: every figure declared 1440×900
 * while the captures are 1440×872 and the posters 1000×606. The browser then
 * reserves a box of the wrong aspect and the page shifts when the image arrives —
 * exactly the layout shift width/height exist to prevent. Eight bytes at a fixed
 * offset is cheaper than being approximately right.
 */
function pngSize(file: string): { width: number; height: number } | undefined {
  try {
    const head = readFileSync(file).subarray(0, 24);
    if (head.length < 24 || head.readUInt32BE(12) !== 0x49484452) return undefined; // 'IHDR'
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  } catch {
    return undefined;
  }
}

/**
 * A screenshot or GIF, resolved at build time.
 *
 * This is a **server** component so it can check whether the asset exists on
 * disk. Captures are produced by driving the real app (plan W6) and land in this
 * repo separately from the prose, so a page can be written before its
 * screenshot exists. Rather than shipping a broken image, an absent asset
 * renders a labelled placeholder of the same shape — which is also what makes
 * "ship on stills, add GIFs per page" (§4.4) a no-op rather than a rewrite.
 */
export function MediaFigure({
  id,
  alt,
  caption,
  gif = false,
  width,
  height,
  priority = false,
}: MediaFigureProps) {
  const stillRel = `/media/stills/${id}.png`;
  const gifRel = `/media/gifs/${id}.gif`;

  const stillFile = join(PUBLIC_DIR, stillRel);
  const hasStill = existsSync(stillFile);
  const hasGif = gif && existsSync(join(PUBLIC_DIR, gifRel));
  const measured = hasStill ? pngSize(stillFile) : undefined;

  if (!hasStill) {
    return (
      <figure className="ws-media">
        <div className="ws-mediabox" data-placeholder="true">
          <span className="ws-mediabox-badge">{gif ? 'GIF' : 'Screenshot'}</span>
          <span className="ws-mediabox-aid">{id}</span>
          <span className="ws-mediabox-what">{alt}</span>
        </div>
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure className="ws-media">
      <MediaPlayer
        still={`${BASE_PATH}${stillRel}`}
        gif={hasGif ? `${BASE_PATH}${gifRel}` : undefined}
        alt={alt}
        width={width ?? measured?.width ?? 1440}
        height={height ?? measured?.height ?? 872}
        priority={priority}
      />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
