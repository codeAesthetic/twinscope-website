'use client';

import { useState } from 'react';

export interface MediaPlayerProps {
  still: string;
  gif?: string;
  alt: string;
  width: number;
  height: number;
  priority: boolean;
}

/**
 * The poster-first swap (plan W5).
 *
 * The still is what renders; the GIF's URL is not even in an `src` until a
 * reader presses play. That single mechanism solves both problems GIF-only
 * creates: page weight, and the fact that a GIF cannot be paused, so
 * `prefers-reduced-motion` has no effect on one that is already running.
 *
 * A plain `<img>` rather than `next/image`: a static export has no Image
 * Optimization API, so `next/image` would add a wrapper and client runtime for
 * markup we already control, and `unoptimized` makes it a passthrough anyway.
 */
export function MediaPlayer({ still, gif, alt, width, height, priority }: MediaPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const playable = Boolean(gif);

  return (
    <div className="ws-mediabox" data-playable={playable ? 'true' : 'false'}>
      {/* eslint-disable-next-line @next/next/no-img-element --
          A static export has no Image Optimization API, so next/image runs in
          `unoptimized` passthrough mode: same bytes, plus a wrapper and a client
          runtime, for markup we already control. Sizes are set explicitly below,
          which is the actual LCP concern the rule is about. */}
      <img
        src={playing && gif ? gif : still}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
      />

      {playable && !playing ? (
        <button
          type="button"
          className="ws-mediabox-play"
          onClick={() => setPlaying(true)}
          aria-label={`Play animation: ${alt}`}
        >
          <span aria-hidden="true">▶</span>
        </button>
      ) : null}

      {playable ? (
        <span className="ws-mediabox-badge">{playing ? 'Playing' : 'GIF · press play'}</span>
      ) : null}
    </div>
  );
}
