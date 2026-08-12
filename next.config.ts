import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

/**
 * Static export, served from a GitHub Pages *project* site (plan W7).
 *
 * `basePath` is not cosmetic: a project site lives at /<repo>, and a static
 * export bakes asset paths into the HTML at build time. Without it every CSS
 * and JS URL 404s on the deployed site while `next build` stays perfectly
 * green — which is why WEB-1's acceptance criterion is that the *deployed*
 * page loads its stylesheet, not that the build passed.
 *
 * `trailingSlash` (W17) makes every route export as `<route>/index.html`, so
 * each page has exactly one address. Pages cannot issue a 301, so a URL that
 * changes after launch is a dead link forever; one canonical form from day one
 * is the whole mitigation.
 */
const BASE_PATH = '/twinscope-website';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  trailingSlash: true,
  // No Image Optimization API exists in a static export.
  images: { unoptimized: true },
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
};

/**
 * Plugins are named as strings, not imported.
 *
 * Turbopack serialises loader options to hand them to its Rust side, so an
 * imported function fails the build with "does not have serializable options".
 * The string form is resolved inside the loader instead.
 */
const withMDX = createMDX({
  // Must be explicit. Left unset, the Turbopack loader rule matches `*` and the
  // MDX pipeline is applied to `.tsx` files too, which fails as a *parse* error
  // inside whichever component happens to contain a template literal.
  extension: /\.mdx$/,
  options: {
    // Frontmatter is read by lib/toc.ts for metadata, but it must also be
    // *removed* from the document, or the `---` block renders as body text.
    // `'yaml'` is the matter preset, not decoration: remark-frontmatter treats
    // `{}` as a matter descriptor and rejects it with "Missing `type` in matter".
    remarkPlugins: [
      ['remark-frontmatter', 'yaml'],
      ['remark-mdx-frontmatter', {}],
    ],
    // Heading ids, from the same github-slugger that lib/toc.ts uses for the
    // TOC — so a rail link and its heading can never disagree.
    rehypePlugins: [['rehype-slug', {}]],
  },
});

export default withMDX(nextConfig);
