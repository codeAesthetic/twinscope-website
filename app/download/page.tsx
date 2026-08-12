import type { Metadata } from 'next';
import Link from 'next/link';

import { Callout, Chip, CodeBlock } from '@/components/content';
import { DownloadCard, type Platform } from '@/components/home/DownloadCard';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import release from '@/data/release.json';
import { SITE, absoluteUrl } from '@/lib/site';

/**
 * Everything version-shaped on this page comes from `data/release.json` (plan
 * W16) — filenames, sizes, the digest and the date. Nothing about a release is
 * hard-coded in this component, so cutting 0.1.1 is a one-file edit.
 */
const PLATFORMS = release.platforms as Platform[];
const MAC = PLATFORMS[0];

const DESCRIPTION =
  `Download TwinScope ${release.version} for macOS, or build it from source. ` +
  'Free, MIT-licensed and offline by design — with the unsigned-build steps stated plainly.';

export const metadata: Metadata = {
  title: 'Download',
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl('/download') },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/download'),
    title: `Download ${SITE.name} ${release.version}`,
    description: DESCRIPTION,
  },
};

const BUILD_STEPS = `# Node 24 (nvm use picks it up from .nvmrc)
git clone ${SITE.repo}.git
cd twinscope
npm install        # also fetches the Electron binary
npm run package:mac`;

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

export default function Download() {
  return (
    <>
      <SiteHeader current="/download" />

      <main id="main" className="ws-wrap">
        <div className="ws-page">
          <Chip tone="acc">
            Latest release · {release.version} · {formatDate(release.date)}
          </Chip>

          <h1>Download {SITE.name}</h1>

          <p className="ws-page-lede">
            Free, MIT-licensed, and offline by design. macOS is the primary target; Windows and
            Linux can be built from the same source, but neither has been run on its own platform.
          </p>

          {/*
            The W9a notice, and the only other place it appears is /changelog.
            It sits above the cards on purpose: this is the moment someone is
            about to install, and a sentence here beats a chip on twelve pages.
          */}
          <Callout tone="note" title="Three features landed after 0.1.0">
            <p>
              Syntax highlighting, <b>⌘F</b> search within a diff, and the three text normalisation
              toggles are in <code>main</code> but{' '}
              <strong>not in the {release.version} download</strong>. The docs describe them because
              they describe the app; to use them today,{' '}
              <a href="#build-it-yourself">build from source</a>. See{' '}
              <Link href="/changelog">the changelog</Link> for the full split.
            </p>
          </Callout>

          <div className="ws-dlgrid">
            {PLATFORMS.map((platform) => (
              <DownloadCard key={platform.id} platform={platform} />
            ))}
          </div>

          {release.assetsPublished ? null : (
            <p className="ws-page-note">
              The {release.version} assets are not published yet: the macOS button goes to the
              repo’s Releases page, and the SHA-256 below is filled in when the release is tagged.
              Building from source works today.
            </p>
          )}

          <Callout tone="warn" title="The macOS build is not signed yet">
            <p>
              Gatekeeper will say the app “cannot be opened because the developer cannot be
              verified.” That is expected: a Developer ID signature and notarisation are not in
              place for {release.version}. To open it anyway: right-click the app in{' '}
              <code>/Applications</code> → <b>Open</b> → <b>Open</b> again. If you would rather not,
              build from source — it is three commands.
            </p>
          </Callout>

          <h2 id="verify">Verify what you downloaded</h2>

          <div className="ws-sums">
            {`SHA-256  ${MAC.filename}`}
            {'\n'}
            <span className="ws-sums-val">
              {MAC.sha256 ??
                'not published yet — the digest is filled in when the release is tagged'}
            </span>
            {'\n\n'}
            <span className="ws-sums-prompt">$</span>
            {` shasum -a 256 ~/Downloads/${MAC.filename}`}
          </div>

          <h2 id="build-it-yourself">Or build it yourself</h2>

          <CodeBlock file="Terminal" lang="bash" code={BUILD_STEPS} />

          <p className="ws-page-note">
            The dmg lands in <code>release/</code>. Nothing compiles on your machine — history uses
            Node’s built-in SQLite, so there is no native module to rebuild. Swap{' '}
            <code>package:mac</code> for <code>package:win</code> or <code>package:linux</code> on
            those platforms, with the caveat above.
          </p>

          <Callout tone="privacy" title="No update checks unless you ask">
            <p>
              {release.version} has no auto-updater. Watch the repo or check{' '}
              <Link href="/changelog">the changelog</Link> — the app will not phone home to find
              out.
            </p>
          </Callout>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
