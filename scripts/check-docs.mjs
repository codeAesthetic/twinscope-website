/**
 * Fails fast when a page listed in `content/nav.ts` has no file, or has one with
 * no `title` / `description` in its frontmatter.
 *
 * The build already refuses to ship such a page — `app/docs/[...slug]/page.tsx`
 * throws rather than calling `notFound()`, deliberately, so 21 unwritten pages
 * cannot ship as broken links behind a green build. But that failure arrives as a
 * Turbopack error after a minute of compiling, naming one page at a time. This
 * runs in milliseconds *before* the build and names all of them at once, which is
 * the difference between a checklist and a guessing game.
 *
 * It parses nav.ts with a regex instead of importing it. Node 24 can strip types
 * from a `.ts` import, but only while printing a MODULE_TYPELESS_PACKAGE_JSON
 * warning on every run, and a permanent warning is how a project learns to ignore
 * warnings. The floor assertion below is what keeps the regex honest — a parser
 * that silently matches nothing must not print a pass.
 *
 * The frontmatter reader is deliberately the same shape as `frontmatterOf()` in
 * lib/toc.ts. If the two ever disagree, the seo regression spec catches it: it
 * asserts the rendered `<meta name="description">` equals what the frontmatter
 * says.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const navFile = join(root, 'content', 'nav.ts');
const docsDir = join(root, 'content', 'docs');

/** Fewer than this means the parse failed, not that the site shrank. */
const MINIMUM_PAGES = 20;

if (!existsSync(navFile)) {
  console.error('[check-docs] content/nav.ts is missing — the site has no page list.');
  process.exit(1);
}

const slugs = [...readFileSync(navFile, 'utf8').matchAll(/\bslug:\s*'([^']+)'/g)].map((m) => m[1]);

if (slugs.length < MINIMUM_PAGES) {
  console.error(
    `[check-docs] only ${slugs.length} slug(s) found in content/nav.ts, expected at least ` +
      `${MINIMUM_PAGES}. Either the nav shrank or this script's parser is broken — check both.`,
  );
  process.exit(1);
}

function frontmatterOf(source) {
  const block = /^---\n([\s\S]*?)\n---/.exec(source);
  if (!block) return undefined;

  const fields = {};
  for (const line of block[1].split('\n')) {
    const pair = /^([a-z]+):\s*(.*)$/i.exec(line.trim());
    if (pair) fields[pair[1]] = pair[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return fields;
}

const problems = [];
const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
for (const slug of new Set(duplicates)) {
  problems.push(`  ${slug} — listed twice in content/nav.ts`);
}

for (const slug of slugs) {
  const file = join(docsDir, `${slug}.mdx`);
  if (!existsSync(file)) {
    problems.push(`  content/docs/${slug}.mdx — missing (listed in nav.ts, so it must exist)`);
    continue;
  }

  const front = frontmatterOf(readFileSync(file, 'utf8'));
  if (!front) {
    problems.push(`  content/docs/${slug}.mdx — no frontmatter block`);
    continue;
  }
  const missing = ['title', 'description'].filter((key) => !front[key]);
  if (missing.length > 0) {
    problems.push(`  content/docs/${slug}.mdx — frontmatter has no ${missing.join(' and no ')}`);
  }
}

if (problems.length > 0) {
  console.error(`[check-docs] ${problems.length} page(s) not ready:`);
  console.error(problems.join('\n'));
  console.error(
    '\nEvery page in content/nav.ts needs a file with a title and a description (W18).',
  );
  console.error('Write the page, or remove it from the nav — there is no third state.');
  process.exit(1);
}

/**
 * An .mdx file the nav does not list builds no route, so nothing links to it and
 * nothing can reach it. Reported rather than failed: a page written ahead of its
 * nav entry is a normal intermediate state, and a page abandoned in that state is
 * worth noticing.
 */
function allMdx(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return allMdx(full);
    return entry.endsWith('.mdx') ? [full] : [];
  });
}

const listed = new Set(slugs);
const orphans = allMdx(docsDir)
  .map((file) =>
    relative(docsDir, file)
      .split(sep)
      .join('/')
      .replace(/\.mdx$/, ''),
  )
  .filter((slug) => !listed.has(slug));

if (orphans.length > 0) {
  console.log(`[check-docs] note: ${orphans.length} page(s) not listed in nav.ts, so unreachable:`);
  for (const slug of orphans) console.log(`  content/docs/${slug}.mdx`);
}

console.log(`[check-docs] ${slugs.length} page(s) listed, all present with title + description.`);
