import type { ReactNode } from 'react';

export { Callout } from './Callout';
export { CodeBlock } from './CodeBlock';
export { MediaFigure } from './MediaFigure';

/** Inline key, e.g. <Kbd>⌘K</Kbd>. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="ws-kbd">{children}</kbd>;
}

export function Chip({
  tone,
  children,
}: {
  tone?: 'acc' | 'add' | 'del' | 'mod';
  children: ReactNode;
}) {
  return (
    <span className="ws-chip" data-tone={tone}>
      {tone ? <span className="ws-dot" /> : null}
      {children}
    </span>
  );
}

/** Wraps a wide table so the page body never scrolls sideways. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="ws-table-wrap">
      <table className="ws-table">{children}</table>
    </div>
  );
}

export interface DiffRow {
  kind?: 'add' | 'del' | 'ctx' | 'fold';
  ln?: string | number;
  /**
   * Row text. `⟦…⟧` marks a changed word and `«…»` a search hit — the same
   * marker convention the app's text engine carries in its rows, so a sample in
   * the docs is written the way the engine actually emits it.
   */
  text: string;
}

/** Splits on the app's ⟦word⟧ marks and «hit» markers in one pass. */
function segments(text: string) {
  return text.split(/(⟦[^⟧]*⟧|«[^»]*»)/g).filter(Boolean);
}

/**
 * A diff rendered with the app's own row treatment — docs about a diff tool
 * should be able to show a diff.
 */
export function DiffSample({
  file,
  summary,
  rows,
}: {
  file: string;
  summary?: string;
  rows: DiffRow[];
}) {
  return (
    <div className="ws-diff">
      <div className="ws-diff-hd">
        <span>{file}</span>
        {summary ? <span className="ws-spacer">{summary}</span> : null}
      </div>
      {rows.map((row, index) => {
        if (row.kind === 'fold') {
          return (
            <div className="ws-drow" data-kind="fold" key={index}>
              {row.text}
            </div>
          );
        }
        return (
          <div className="ws-drow" data-kind={row.kind ?? 'ctx'} key={index}>
            <span className="ws-drow-ln">{row.ln ?? ''}</span>
            <span className="ws-drow-tx">
              {segments(row.text).map((part, i) => {
                if (part.startsWith('⟦')) {
                  return (
                    <span className="ws-wchg" key={i}>
                      {part.slice(1, -1)}
                    </span>
                  );
                }
                if (part.startsWith('«')) {
                  return (
                    <span className="ws-hit" key={i}>
                      {part.slice(1, -1)}
                    </span>
                  );
                }
                return <span key={i}>{part}</span>;
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
