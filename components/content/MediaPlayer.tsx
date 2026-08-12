'use client';

import { useState } from 'react';

import { Lightbox } from './Lightbox';

export interface MediaPlayerProps {
  still: string;
  gif?: string;
  alt: string;
  width: number;
  height: number;
  priority: boolean;
  caption?: string;
}

/**
 * Poster-first media (plan W5), with click-to-zoom.
 *
 * The still is what renders; the GIF's URL is not in an `src` until a reader
 * presses play. That single mechanism solves both problems GIF-only creates: page
 * weight, and the fact that a GIF cannot be paused, so `prefers-reduced-motion`
 * has no effect on one that is already running.
 *
 * Zoom exists because the figures are shown at about 638px in the docs column
 * while the captures are 1000–4976px wide — the detail is already in the asset and
 * was simply not visible. Clicking the image opens it; the play button is its own
 * small target so the two gestures never fight over the same pixel.
 *
 * A plain `<img>` rather than `next/image`: a static export has no Image
 * Optimization API, so `next/image` would add a wrapper and client runtime for
 * markup we already control, and `unoptimized` makes it a passthrough anyway.
 */
export function MediaPlayer({
  still,
  gif,
  alt,
  width,
  height,
  priority,
  caption,
}: MediaPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const playable = Boolean(gif);
  const current = playing && gif ? gif : still;

  return (
    <>
      <div className="ws-mediabox" data-playable={playable ? 'true' : 'false'}>
        {/*
          The image is wrapped in a button rather than given an onClick, so it is
          reachable by keyboard and announced as the control it is. A div with a
          click handler would leave zoom mouse-only.
        */}
        <button
          type="button"
          className="ws-mediabox-zoom"
          onClick={() => setZoomed(true)}
          aria-label={`View larger: ${alt}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element --
              A static export has no Image Optimization API, so next/image runs in
              `unoptimized` passthrough mode: same bytes, plus a wrapper and a
              client runtime, for markup we already control. Sizes are set
              explicitly, which is the actual LCP concern the rule is about. */}
          <img
            src={current}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
          />
        </button>

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

        <span className="ws-mediabox-badge">
          {playable ? (playing ? 'Playing' : 'GIF · press play') : 'Click to enlarge'}
        </span>
      </div>

      {/*
        `caption ?? alt`: alt text on this site describes what changed rather than
        saying "screenshot of TwinScope", so a zoomed figure keeps its explanation
        instead of losing it when no explicit captionText was written.
      */}
      {zoomed ? (
        <Lightbox
          src={current}
          alt={alt}
          width={width}
          height={height}
          caption={caption ?? alt}
          onClose={() => setZoomed(false)}
        />
      ) : null}
    </>
  );
}
