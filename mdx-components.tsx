import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';

import {
  Callout,
  CodeBlock,
  DiffSample,
  Chip,
  Kbd,
  MediaFigure,
  Table,
} from '@/components/content';

/**
 * What MDX can use without importing anything.
 *
 * Headings get their anchor here rather than via a rehype plugin, so the markup
 * matches the mock exactly (`rehype-slug` still supplies the id).
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: ({ id, children, ...rest }) => (
      <h2 id={id} {...rest}>
        {children}
        <a className="ws-anchor" href={`#${id}`} aria-label="Link to this section">
          #
        </a>
      </h2>
    ),
    h3: ({ id, children, ...rest }) => (
      <h3 id={id} {...rest}>
        {children}
        <a className="ws-anchor" href={`#${id}`} aria-label="Link to this section">
          #
        </a>
      </h3>
    ),
    // Internal links go through next/link so navigation stays client-side;
    // anything absolute is left alone.
    a: ({ href = '', children, ...rest }) =>
      href.startsWith('/') ? (
        <Link href={href} {...rest}>
          {children}
        </Link>
      ) : (
        <a href={href} {...rest}>
          {children}
        </a>
      ),
    table: ({ children }) => <Table>{children}</Table>,
    Callout,
    CodeBlock,
    DiffSample,
    Chip,
    Kbd,
    MediaFigure,
    ...components,
  };
}
