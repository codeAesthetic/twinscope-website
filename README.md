# twinscope-website

Documentation site for [TwinScope](https://github.com/codeAesthetic/twinscope) — a local-first
desktop app that compares files, folders, JSON and images and explains what changed.

Static Next.js, deployed to GitHub Pages at
**https://codeaesthetic.github.io/twinscope-website/**

Documents TwinScope **0.1.0**.

---

## Getting started

```bash
nvm use          # Node 24, from .nvmrc
npm install
npm run dev      # http://localhost:3000/twinscope-website
```

The dev URL includes `/twinscope-website` because the site is a GitHub Pages **project** site and
carries a `basePath`. Dropping it locally would hide the one bug that only appears once deployed.

## Scripts

| Command                  | What it does                                                 |
| ------------------------ | ------------------------------------------------------------ |
| `npm run dev`            | Next dev server                                              |
| `npm run build`          | Static export into `out/`                                    |
| `npm run serve`          | Serves the built `out/` on :4321                             |
| `npm run typecheck`      | `tsc --noEmit`                                               |
| `npm run lint`           | ESLint                                                       |
| `npm run format`         | Prettier (`format:check` in CI)                              |
| `npm run check:tokens`   | Fails if `styles/tokens.css` has drifted from the app's copy |
| `npm run check:external` | Fails if the build references any third-party host           |
| `npm run check:media`    | Enforces the image and GIF budget                            |
| `npm run gate`           | All of the above, in CI order                                |

**Run `npm run gate` before every commit.**

## How it is built

- **Static export.** `output: 'export'` — no server, no runtime. Every route is a real HTML file, which is also the best case for search engines.
- **Design comes from the app.** `styles/tokens.css` is copied verbatim from TwinScope's own tokens and machine-checked for drift. Never hand-tune a value here; change it in the app and re-copy.
- **No third-party requests, at all.** No analytics, no CDN fonts, no embeds, no hosted search. Privacy is the product, and a docs site that ships trackers spends credibility the app earned. `npm run check:external` enforces it.
- **Media is screenshots and GIFs**, produced by driving the real app with its own Playwright harness, then committed here. Every GIF is poster-first: the page renders a still and only fetches the GIF when a reader presses play, so nothing animates under `prefers-reduced-motion` and no one downloads megabytes they did not ask for.
- **URLs are permanent.** GitHub Pages cannot issue a redirect, so `trailingSlash` is on and the URL shape is fixed.

## Layout

```
app/         routes; docs content lives here as page.mdx files
components/  ported from the approved design
content/     nav.ts — the one ordering the sidebar, TOC and pager all read
lib/         site.ts — where the site lives
styles/      tokens.css (copied from the app) · site-tokens.css · base.css
scripts/     the checks that run in the gate
public/media/ screenshots and GIFs
```

## Licence

MIT — see [LICENSE](LICENSE).
