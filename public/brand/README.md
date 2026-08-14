# Brand

The TwinScope mark: twin lenses either side of a divider — the split view the
app is built around, and the two halves of the name.

| File                                       | Use                                                           |
| ------------------------------------------ | ------------------------------------------------------------- |
| `twinscope-mark.svg`                       | the master. Transparent, flat, no shadow — scales to any size |
| `twinscope-mark-{1024,512,256,128,64}.png` | raster fallbacks, transparent                                 |
| `twinscope-lockup.png`                     | mark + wordmark, light text, for dark backgrounds             |
| `twinscope-lockup-dark-text.png`           | the same lockup for light backgrounds                         |

These are served as static files for anyone who needs the logo — press, a README,
a package listing. The site itself does **not** use them.

## Where the site's own logo comes from

Three places, and they have to be changed together:

- **`styles/primitives.css` → `.ws-logo`** draws the header and footer mark. The
  tile is a CSS gradient so it follows `--acc` into the light theme; the glyph is
  an alpha mask from `--ws-mark` in `styles/site-tokens.css`, because a `<span>`
  has one spare pseudo-element and the mark has three shapes. The mask is a data
  URI on purpose: CSS `url()` is not rewritten by Next's `basePath`, and this site
  is served from a project subpath, so an absolute `/brand/…` would 404 in
  production.
- **`app/icon.svg`** is the tab icon. Next's App Router picks it up by filename.
  Being standalone it cannot read a token, so its gradient carries the dark-theme
  accent literally.
- **`app/favicon.ico`** is the legacy fallback, 16/32/48/64 PNGs in an ICO
  container.

## Geometry

Proportional, not fixed. On a 100-unit tile: corner radius 28.2, lenses at x 26.5
and 73.5 with radius 10.5 and stroke 4.4, divider 5.13 wide and 59 tall. Scale
those; do not redraw by eye.

The gradient is `linear-gradient(145deg, #7c6cff, #4b8bff)`. CSS measures that
angle clockwise from "to top", so in SVG it runs from `10.06,-7.05` to
`89.94,107.05` — a plain corner-to-corner diagonal is 135deg and reads wrong.

The mark holds down to 16px. Below that, drop the divider rather than shrinking
all three shapes.

> The app's icon (`build/icon.png` in the app repo, drawn procedurally by
> `scripts/make-icon.mjs`) is **not** yet this mark. It still carries the older
> two-panel glyph.
