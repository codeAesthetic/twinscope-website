import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import GithubSlugger from 'github-slugger';

export interface Heading {
  id: string;
  text: string;
  depth: 2 | 3;
}

const DOCS_DIR = join(process.cwd(), 'content', 'docs');

/**
 * Reads a page's h2/h3 headings straight from its MDX source at build time.
 *
 * Uses the same slugger `rehype-slug` uses, so a TOC link and the heading's id
 * cannot disagree — that mismatch is silent and only shows up as an anchor that
 * scrolls nowhere.
 *
 * Fenced code is stripped first: a `# comment` inside a bash block is not a
 * heading, and a diff sample full of `--- a/file` most certainly is not.
 */
export async function headingsOf(slug: string): Promise<Heading[]> {
  let source: string;
  try {
    source = await readFile(join(DOCS_DIR, `${slug}.mdx`), 'utf8');
  } catch {
    return [];
  }

  const body = source
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/^```[\s\S]*?^```/gm, '')
    .replace(/^ {4}.*$/gm, '');

  const slugger = new GithubSlugger();
  const headings: Heading[] = [];

  for (const match of body.matchAll(/^(#{2,3})\s+(.+?)\s*$/gm)) {
    const depth = match[1].length === 2 ? 2 : 3;
    // Strip inline markdown so the rail reads as text, not source.
    const text = match[2]
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .trim();
    headings.push({ id: slugger.slug(text), text, depth });
  }

  return headings;
}

/** Frontmatter we require of every docs page (plan W18). */
export interface DocFrontmatter {
  title: string;
  description: string;
  lede?: string;
}

export async function frontmatterOf(slug: string): Promise<DocFrontmatter | undefined> {
  let source: string;
  try {
    source = await readFile(join(DOCS_DIR, `${slug}.mdx`), 'utf8');
  } catch {
    return undefined;
  }

  const block = /^---\n([\s\S]*?)\n---/.exec(source);
  if (!block) return undefined;

  const fields: Record<string, string> = {};
  for (const line of block[1].split('\n')) {
    const pair = /^([a-z]+):\s*(.*)$/i.exec(line.trim());
    if (pair) fields[pair[1]] = pair[2].replace(/^['"]|['"]$/g, '');
  }

  if (!fields.title || !fields.description) return undefined;
  return { title: fields.title, description: fields.description, lede: fields.lede };
}
