import type { ReactNode } from 'react';

type Tone = 'note' | 'tip' | 'warn' | 'privacy';

const GLYPH: Record<Tone, string> = {
  note: '◈',
  tip: '◈',
  warn: '◈',
  privacy: '◈',
};

const DEFAULT_TITLE: Record<Tone, string> = {
  note: 'Note',
  tip: 'Worth knowing',
  warn: 'Careful',
  privacy: 'Privacy',
};

/**
 * Tone is carried by a border colour *and* a label, never colour alone — the
 * same rule the app follows for its diff statuses.
 */
export function Callout({
  tone = 'note',
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  return (
    <aside className="ws-callout" data-tone={tone}>
      <strong className="ws-callout-t">
        <span aria-hidden="true">{GLYPH[tone]}</span>
        {title ?? DEFAULT_TITLE[tone]}
      </strong>
      {children}
    </aside>
  );
}
