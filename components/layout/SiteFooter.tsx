import Link from 'next/link';

import { SITE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="ws-ft">
      <div className="ws-wrap">
        <div className="ws-ft-cols">
          <div>
            <span className="ws-brand">
              <span className="ws-logo" aria-hidden="true" />
              {SITE.name}
            </span>
            <p className="ws-ft-blurb">
              Compare anything. Understand what changed. Local-first, open source, and quiet about
              it.
            </p>
          </div>

          <div>
            <h2>Docs</h2>
            <Link href="/docs/getting-started/what-is-twinscope">Getting started</Link>
            <Link href="/docs/engines/text">Engines</Link>
            <Link href="/docs/reference/keyboard">Keyboard map</Link>
            <Link href="/docs/getting-started/privacy">Privacy</Link>
          </div>

          <div>
            <h2>Project</h2>
            <Link href="/download">Download</Link>
            <Link href="/changelog">Changelog</Link>
            <a href={SITE.repo}>GitHub</a>
            <a href={`${SITE.repo}/issues`}>Issues</a>
          </div>

          <div>
            <h2>Legal</h2>
            <a href={`${SITE.websiteRepo}/blob/main/LICENSE`}>MIT licence</a>
            <Link href="/docs/getting-started/privacy">No cookies, no trackers</Link>
          </div>
        </div>

        <div className="ws-ft-bot">
          <span>© 2026 codeAesthetic</span>
          <span className="ws-spacer" />
          <span className="ws-chip" data-tone="add">
            <span className="ws-dot" />
            This site makes zero third-party requests
          </span>
        </div>
      </div>
    </footer>
  );
}
