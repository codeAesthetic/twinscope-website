import type { Metadata } from 'next';
import Link from 'next/link';

import { Chip, Kbd, MediaFigure } from '@/components/content';
import { EngineCard } from '@/components/home/EngineCard';
import { Step } from '@/components/home/Step';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SITE, absoluteUrl } from '@/lib/site';

const DESCRIPTION =
  'A local-first desktop app that compares files, folders, JSON and images. Drop two things in, ' +
  'TwinScope detects what they are, picks the right diff engine, and explains what changed. ' +
  'No account, no telemetry, no network calls at runtime.';

export const metadata: Metadata = {
  // Absolute, because this one page's title is the brand line rather than
  // "<page> · TwinScope" — the template in layout.tsx would double the name.
  title: { absolute: `${SITE.name} — ${SITE.tagline}` },
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl('/') },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/'),
    title: `${SITE.name} — ${SITE.tagline}`,
    description: DESCRIPTION,
  },
};

/**
 * `SoftwareApplication` structured data (plan W18).
 *
 * Inline JSON, not a fetch: the whole site makes zero third-party requests (W4),
 * and a static export has nowhere to serve a separate document from anyway. The
 * claims here are the same ones the page makes in prose — price 0, MIT, macOS —
 * so there is one truth, not a machine-readable variant of it.
 */
const SOFTWARE_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE.name,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'macOS 13 or later',
  softwareVersion: SITE.documentsVersion,
  url: absoluteUrl('/'),
  downloadUrl: absoluteUrl('/download'),
  softwareHelp: absoluteUrl('/docs/getting-started/what-is-twinscope'),
  releaseNotes: absoluteUrl('/changelog'),
  description: DESCRIPTION,
  license: 'https://opensource.org/license/mit',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'codeAesthetic' },
  featureList: [
    'Text and code diffs with word-level marks',
    'Structural JSON comparison',
    'Recursive folder comparison with drill-in',
    'Image comparison with overlay, blink and difference modes',
    'Binary verdict from sizes and SHA-256',
    'HTML, Markdown and patch export',
  ],
};

export default function Landing() {
  return (
    <>
      <SiteHeader current="/" />

      <main id="main">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_LD) }}
        />

        <section className="ws-hero">
          <div className="ws-wrap">
            <Chip tone="acc">Local-first · open source · v{SITE.documentsVersion} for macOS</Chip>

            <h1>
              Compare anything. <em>Understand what changed.</em>
            </h1>

            <p className="ws-hero-sub">
              Drop two files, folders, images or clipboard contents. TwinScope detects what they
              are, picks the right diff engine, and shows you what actually changed — not a wall of
              red and green.
            </p>

            <div className="ws-hero-cta">
              <Link className="ws-btn" data-variant="primary" data-size="lg" href="/download">
                Download for macOS <Kbd>.dmg</Kbd>
              </Link>
              <Link
                className="ws-btn"
                data-size="lg"
                href="/docs/getting-started/what-is-twinscope"
              >
                Read the docs
              </Link>
            </div>

            <p className="ws-hero-fine">
              Free and MIT-licensed · no account · no telemetry · no network calls at runtime
            </p>

            <div className="ws-heroshot">
              <div className="ws-appframe">
                <div className="ws-appframe-tb">
                  <span className="ws-lights" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="ws-appframe-title">
                    users-v2.3.json <span style={{ color: 'var(--acc-2)' }}>↔</span> users-v2.4.json
                  </span>
                </div>
                <MediaFigure
                  id="R1-json-normalisation"
                  gif
                  priority
                  alt="Two JSON files compared as a tree, with ignore array order toggled off and on and the counts changing with it"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="ws-sec">
          <div className="ws-wrap">
            <div className="ws-sec-hd">
              <span className="ws-eyebrow">Five engines</span>
              <h2>The right diff for the thing you dropped</h2>
              <p>
                Type detection picks the engine. You can always override it — and every engine
                explains what it did.
              </p>
            </div>

            <div className="ws-egrid">
              <EngineCard
                badge="TXT"
                title="Text & code"
                href="/docs/engines/text"
                linkLabel="Text & code diffs"
                media={
                  <MediaFigure
                    id="R2-text-view-modes"
                    gif
                    alt="A text comparison cycling through side-by-side, unified and inline"
                  />
                }
              >
                Side-by-side, unified and inline. Edited lines pair up and are marked word by word
                instead of appearing as unrelated deletes and adds. Long unchanged runs fold. Syntax
                highlighting and <Kbd>⌘F</Kbd> search.
              </EngineCard>

              <EngineCard
                badge="JSON"
                hue="json"
                title="JSON"
                href="/docs/engines/json"
                linkLabel="Structural JSON diffs"
                media={
                  <MediaFigure
                    id="json-tree"
                    alt="A structural JSON comparison shown as an expandable tree with per-key statuses"
                  />
                }
              >
                A structural tree, not a line diff — reformat a file and nothing changes. Arrays
                match by identity, objects compare as key sets, and type changes get their own row.
              </EngineCard>

              <EngineCard
                badge="DIR"
                hue="dir"
                title="Folders"
                href="/docs/engines/folders"
                linkLabel="Folder comparison"
                media={
                  <MediaFigure
                    id="R4-folder-drill-in"
                    gif
                    alt="A folder comparison filtered to modified files, then drilling into one file pair and back"
                  />
                }
              >
                Recursive, with per-file status, rename pairing, filters, and drill-in to any file
                pair — without re-scanning the tree when you come back.
              </EngineCard>

              <EngineCard
                badge="IMG"
                hue="img"
                title="Images"
                href="/docs/engines/images"
                linkLabel="Image comparison"
                media={
                  <MediaFigure
                    id="R5-image-modes"
                    gif
                    alt="An image comparison switching between side-by-side, overlay, blink and difference modes"
                  />
                }
              >
                Side-by-side, overlay, blink and difference, with changed regions boxed, zoom to
                400%, and a threshold you can move.
              </EngineCard>

              <EngineCard
                badge="BIN"
                title="Binary"
                href="/docs/engines/binary"
                linkLabel="Binary files"
                media={
                  <MediaFigure
                    id="binary-verdict"
                    alt="The binary verdict panel showing both file sizes and their SHA-256 digests"
                  />
                }
              >
                A verdict from sizes and a SHA-256, instead of pages of mojibake. Honest about what
                it cannot tell you.
              </EngineCard>

              <EngineCard
                badge="···"
                hue="muted"
                title="Not built yet"
                href={`${SITE.repo}/issues`}
                linkLabel="Open an issue"
                external
                soon
              >
                YAML, XML, CSV and git refs are wanted, not written. There is no roadmap page here
                on purpose: <strong>everything this site documents, the app does today.</strong>{' '}
                Ideas and requests live in the repo’s issues.
              </EngineCard>
            </div>
          </div>
        </section>

        <section className="ws-sec">
          <div className="ws-wrap">
            <div className="ws-sec-hd">
              <span className="ws-eyebrow">How it works</span>
              <h2>Three moves, then read the answer</h2>
            </div>

            <div className="ws-steps">
              <Step n={1} title="Give it two things">
                Drag them in, pick them from disk, or paste with <Kbd>⌘V</Kbd>. Clipboard images
                spill to a temp file automatically.
              </Step>
              <Step
                n={2}
                title={
                  <>
                    Press <Kbd>⏎</Kbd>
                  </>
                }
              >
                Detection resolves the pair to an engine and says which one. Comparisons run off the
                UI thread and can be cancelled mid-flight.
              </Step>
              <Step n={3} title="Read, then share">
                Counts first, detail second. Step through changes with <Kbd>⌥↑</Kbd> <Kbd>⌥↓</Kbd>,
                then export an HTML report, Markdown, or a patch.
              </Step>
            </div>
          </div>
        </section>

        <section className="ws-sec">
          <div className="ws-wrap">
            <div className="ws-privacy">
              <div>
                <Chip tone="add">Privacy is the product</Chip>
                <h2>Your files never leave your machine</h2>
                <p>
                  TwinScope makes <strong>no network calls at runtime — none at all.</strong> There
                  is no account, no telemetry, not even an opt-in crash reporter. This website ships
                  no analytics and no third-party requests either, which you can verify in your
                  browser’s network panel.
                </p>
                <Link className="ws-btn" href="/docs/getting-started/privacy">
                  How to verify it yourself
                </Link>
              </div>

              <ul className="ws-plist">
                <li data-kind="yes">
                  <i aria-hidden="true">✓</i>
                  <span>
                    <b>Stored:</b> paths, sizes, engine, options and summary counts, in a local
                    SQLite file
                  </span>
                </li>
                <li data-kind="no">
                  <i aria-hidden="true">✕</i>
                  <span>
                    <b>Never stored:</b> file contents — main strips them itself rather than
                    trusting the caller
                  </span>
                </li>
                <li data-kind="yes">
                  <i aria-hidden="true">✓</i>
                  <span>
                    The renderer is sandboxed, context-isolated, and cannot reach <code>fs</code>
                  </span>
                </li>
                <li data-kind="no">
                  <i aria-hidden="true">✕</i>
                  <span>No uploads, no cloud sync, no “anonymous usage statistics”</span>
                </li>
                <li data-kind="yes">
                  <i aria-hidden="true">✓</i>
                  <span>Exports are written only when you ask, to the path you choose</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="ws-sec">
          <div className="ws-wrap">
            <div className="ws-split">
              <div>
                <span className="ws-eyebrow">Keyboard first</span>
                <h2>Every mouse action has a key</h2>
                <p>
                  One registry drives what fires, what the Settings grid lists, and what the palette
                  offers — so the app can never document a key it does not have. Press <Kbd>⌘K</Kbd>{' '}
                  and type.
                </p>
                <Link className="ws-btn" href="/docs/reference/keyboard">
                  Full keyboard map
                </Link>
              </div>

              <MediaFigure
                id="palette-filtered"
                alt="The command palette with a query typed and the action list narrowed to matching commands"
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
