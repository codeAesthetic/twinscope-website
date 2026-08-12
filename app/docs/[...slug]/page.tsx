import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { Pager } from '@/components/docs/Pager';
import { TocRail } from '@/components/docs/TocRail';
import { FLAT_NAV, groupOf, navItem } from '@/content/nav';
import { SITE } from '@/lib/site';
import { frontmatterOf, headingsOf } from '@/lib/toc';

/**
 * Every docs page.
 *
 * **Deviation from plan W2**, recorded here because it is load-bearing: content
 * lives under `content/docs/` as .mdx behind this catch-all route, rather than
 * as `page.mdx` files inside the app router. The reason is the TOC. A layout is
 * not given the current pathname, so a per-directory `page.mdx` cannot build a
 * server-rendered "On this page" — the TOC would have to be extracted in the
 * browser, which means no TOC without JS. A catch-all route knows its own slug,
 * so it can read the MDX source at build time for both the headings and the
 * frontmatter. Everything else about W2 stands: plain MDX files, no docs
 * framework, one hand-written nav.
 *
 * Never write a glob with a doubled star followed by a slash inside a block
 * comment: that sequence closes the comment, and the prose after it is parsed
 * as code — which surfaces as a syntax error on some unrelated later line.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return FLAT_NAV.map((item) => ({ slug: item.slug.split('/') }));
}

type Params = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slug = (await params).slug.join('/');
  const front = await frontmatterOf(slug);
  if (!front) return {};

  return {
    title: front.title,
    description: front.description,
    alternates: { canonical: `/docs/${slug}` },
    openGraph: {
      title: `${front.title} · ${SITE.name}`,
      description: front.description,
      url: `/docs/${slug}`,
      type: 'article',
    },
  };
}

export default async function DocPage({ params }: Params) {
  const slug = (await params).slug.join('/');
  const item = navItem(slug);
  const front = await frontmatterOf(slug);

  // Every built slug comes from nav.ts, so a missing file or missing frontmatter
  // is always a mistake in this repo — never something a reader should reach.
  // It must fail the build loudly: `notFound()` here would quietly emit a 404
  // page and let 21 unwritten pages ship as broken links with a green build.
  if (!item) notFound();
  if (!front) {
    throw new Error(
      `content/docs/${slug}.mdx is missing, or has no \`title\` and \`description\` in its frontmatter. ` +
        `It is listed in content/nav.ts, so it must exist. Remove it from the nav or write the page.`,
    );
  }

  const [headings, { default: Content }] = await Promise.all([
    headingsOf(slug),
    import(`@/content/docs/${slug}.mdx`) as Promise<{ default: React.ComponentType }>,
  ]);

  const group = groupOf(slug);
  const editUrl = `${SITE.websiteRepo}/edit/main/content/docs/${slug}.mdx`;

  return (
    <div className="ws-wrap">
      <div className="ws-docs">
        <DocsSidebar current={slug} />

        <article className="ws-prose" id="main">
          <nav className="ws-crumb" aria-label="Breadcrumb">
            <Link href="/docs/getting-started/what-is-twinscope">Docs</Link>
            <span aria-hidden="true">/</span>
            {group ? <span>{group.label}</span> : null}
            <span aria-hidden="true">/</span>
            <span style={{ color: 'var(--tx-2)' }}>{front.title}</span>
          </nav>

          <h1>{front.title}</h1>
          {front.lede ? <p className="ws-lede">{front.lede}</p> : null}

          <div className="ws-docmeta">
            <span>{group?.label}</span>
            <span className="ws-spacer">
              <a href={editUrl}>Edit this page</a>
            </span>
          </div>

          <Content />

          <Pager current={slug} />
        </article>

        <TocRail headings={headings} />
      </div>
    </div>
  );
}
