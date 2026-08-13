import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Metadata } from 'next';
import { Fragment, type ReactNode } from 'react';

import { Chip } from '@/components/content';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SITE, absoluteUrl } from '@/lib/site';

/**
 * The changelog, rendered at build time from the app's own release notes.
 *
 * `data/changelog.md` is a **copy** of the app repo's `CHANGELOG.md`, on purpose:
 * this repo's CI has no app checkout, so reading across the two would build here
 * and fail there. Refresh it with:
 *
 *   cp ../project_dev_diff/CHANGELOG.md data/changelog.md
 *
 * — and nothing else, so `git diff` on that file is exactly the release-note
 * diff. Editing it here instead of in the app repo is how the two drift.
 *
 * Parsed rather than run through MDX because the shape is fixed and known
 * (Keep a Changelog: `## version`, `### section`, bullets) and because the
 * output has to land in the mock's `ws-rel` markup, not in generic prose.
 */
const SOURCE = join(process.cwd(), 'data', 'changelog.md');

const DESCRIPTION =
  `Every release of ${SITE.name}, generated from the app's own CHANGELOG.md so it cannot drift ` +
  `from the release notes.`;

export const metadata: Metadata = {
  title: 'Changelog',
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl('/changelog') },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/changelog'),
    title: `Changelog · ${SITE.name}`,
    description: DESCRIPTION,
  },
};

interface Section {
  title: string;
  items: string[];
}

interface Release {
  /** Stable anchor: derived from the version alone, never from the date. */
  id: string;
  version: string;
  /** ISO date from the heading; absent for `Unreleased`. */
  date?: string;
  intro: string[];
  sections: Section[];
}

/**
 * Keep a Changelog, parsed.
 *
 * Bullets wrap across lines in the source (the app's file is prettier-formatted
 * at 80 columns), so a continuation line has to be folded back into the bullet
 * it belongs to rather than becoming an item of its own.
 */
function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  let release: Release | undefined;
  let section: Section | undefined;
  let buffer: string[] = [];
  let mode: 'item' | 'para' = 'item';

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.join(' ').replace(/\s+/g, ' ').trim();
    buffer = [];
    if (!release) return;
    if (mode === 'para') release.intro.push(text);
    else if (section) section.items.push(text);
    else release.intro.push(text);
  };

  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd();

    // `^##\s` cannot match `###`, so a release heading and a section heading
    // never collide.
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      const [, text] = heading;
      const parts = /^(\S+)(?:\s+[—–-]\s+(\S+))?/.exec(text);
      const version = parts?.[1] ?? text;
      release = {
        id:
          version.toLowerCase() === 'unreleased' ? 'unreleased' : `v${version.replace(/\./g, '-')}`,
        version,
        date: parts?.[2],
        intro: [],
        sections: [],
      };
      section = undefined;
      releases.push(release);
      continue;
    }

    const sub = /^###\s+(.+)$/.exec(line);
    if (sub && release) {
      flush();
      section = { title: sub[1], items: [] };
      release.sections.push(section);
      continue;
    }

    const bullet = /^\s*-\s+(.+)$/.exec(line);
    if (bullet) {
      flush();
      mode = 'item';
      buffer.push(bullet[1]);
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }

    // A continuation of the open bullet, or — before any bullet — the release's
    // own introductory paragraph.
    if (buffer.length === 0) mode = 'para';
    buffer.push(line.trim());
  }

  flush();
  return releases;
}

/**
 * Rewrites a link that only made sense inside the app repo.
 *
 * This page renders the app's own CHANGELOG.md, and its relative links point at
 * files in that repository — `docs/ci.md`, `docs/visual-regression.md`. On the
 * website those resolve to nothing, which the link checker catches. They are sent
 * to the file on GitHub rather than guessed at a site page: the changelog is
 * quoting a specific document, and a plausible-looking substitute would be a
 * different one.
 */
function resolveHref(href: string): string {
  if (/^[a-z]+:|^\/|^#/.test(href)) return href;
  return `${SITE.repo}/blob/main/${href.replace(/^\.\//, '')}`;
}

/**
 * The inline markdown a changelog actually uses: bold, emphasis, code and links.
 * Recursive, because the app's notes put code inside bold (`**Per-side `＋`**`),
 * and a flat pass would render the backticks.
 */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);

  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{inline(part.slice(2, -2))}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{inline(part.slice(1, -1))}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      return (
        <a key={index} href={resolveHref(link[2])}>
          {link[1]}
        </a>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function longDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

export default async function Changelog() {
  const releases = parseChangelog(await readFile(SOURCE, 'utf8'));

  return (
    <>
      <SiteHeader current="/changelog" />

      <main id="main" className="ws-wrap">
        <div className="ws-page" data-narrow="true">
          <h1>Changelog</h1>

          <p className="ws-page-lede">
            Rendered at build time from the app repo’s <code>CHANGELOG.md</code>, so this page says
            what the release notes say. <b>Unreleased</b> is the honest part: it is what sits in{' '}
            <code>main</code> and not in the {SITE.documentsVersion} download.
          </p>

          {releases.map((release, index) => {
            const unreleased = release.id === 'unreleased';
            const previous = releases[index + 1];
            const when = unreleased
              ? previous
                ? `since ${previous.version}`
                : 'not yet released'
              : release.date
                ? longDate(release.date)
                : '';

            return (
              <article className="ws-rel" key={release.id}>
                <h2 id={release.id}>
                  {release.version}
                  {unreleased ? <Chip tone="mod">in main</Chip> : null}
                  {!unreleased && index === releases.length - 1 ? (
                    <Chip tone="add">first release</Chip>
                  ) : null}
                </h2>

                {when ? <span className="ws-rel-when">{when}</span> : null}

                {release.intro.map((paragraph) => (
                  <p key={paragraph}>{inline(paragraph)}</p>
                ))}

                {release.sections.map((section) => (
                  <Fragment key={section.title}>
                    <h3>{section.title}</h3>
                    <ul>
                      {section.items.map((item) => (
                        <li key={item}>{inline(item)}</li>
                      ))}
                    </ul>
                  </Fragment>
                ))}
              </article>
            );
          })}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
