import { highlight } from '@/lib/highlight';

export interface CodeBlockProps {
  code: string;
  lang?: string;
  /** Shown in the header bar — a real path, or something like "Terminal". */
  file?: string;
}

/**
 * Server component: shiki runs at build time (plan W8), so a code block ships
 * as coloured HTML with no client JS at all.
 */
export async function CodeBlock({ code, lang = 'text', file }: CodeBlockProps) {
  const html = await highlight(code.replace(/\n$/, ''), lang);

  return (
    <div className="ws-code">
      {file ? (
        <div className="ws-code-hd">
          <span>{file}</span>
          <span className="ws-code-lang">{lang}</span>
        </div>
      ) : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
