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

export default createMDX({})(nextConfig);
