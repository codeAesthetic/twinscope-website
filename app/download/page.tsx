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

          <h2 id="command-line">Or skip the download: the command line</h2>

          <p className="ws-page-note">
            Every engine on this page also runs from a terminal, and that route needs no dmg, no
            Gatekeeper detour and no download at all — just Node 22.12 or newer.
          </p>

          <CodeBlock
            file="Run it once, or install it"
            lang="bash"
            code={`npx twinscope before.json after.json

npm install -g twinscope`}
          />

          <p className="ws-page-note">
            One bundled file with zero dependencies and no native modules. It is the same detection
            and the same engines as the app, and it exits 0, 1 or 2 so a script can act on the
            answer — see <Link href="/docs/tools/cli">the command line</Link> and{' '}
            <Link href="/docs/tools/ci">CI</Link>.
          </p>

          <h2 id="build-it-yourself">Or build it yourself</h2>

          <CodeBlock file="Terminal" lang="bash" code={BUILD_STEPS} />

          <p className="ws-page-note">
            The dmg lands in <code>release/</code>. Nothing compiles on your machine — history uses
            Node’s built-in SQLite, so there is no native module to rebuild. Swap{' '}
            <code>package:mac</code> for <code>package:win</code> or <code>package:linux</code> on
            those platforms, with the caveat above.
          </p>

          <Callout tone="privacy" title="No auto-update, and no update check unless you ask">
            <p>
              Nothing here updates itself. {release.version} can <em>tell</em> you when a newer
              version exists — a switch in Settings, off by default, that asks GitHub for the latest
              version number once per launch. It never downloads or installs anything: the release
              page opens in your browser and you decide. With the switch off nothing is contacted at
              all. See <Link href="/docs/history/updates">Update checks</Link>, or watch{' '}
              <Link href="/changelog">the changelog</Link>.
            </p>
          </Callout>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
