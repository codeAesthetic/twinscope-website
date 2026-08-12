import type { Metadata } from 'next';

import { ThemeToggle } from '@/components/ThemeToggle';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * WEB-1 stands in for the landing page. Its job is to prove the deploy: real
 * tokens, both themes, and enough markup that a missing `basePath` is obvious
 * (an unstyled page, not a subtly-off one). WEB-3 ports the approved hero from
 * website.html.
 */
export default function Home() {
  return (
    <main id="main" className="ws-wrap" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
        <span className="ws-logo" aria-hidden="true" />
        <strong style={{ fontSize: 17, letterSpacing: '-0.02em' }}>{SITE.name}</strong>
        <span className="ws-ver">{SITE.documentsVersion}</span>
        <span style={{ marginLeft: 'auto' }}>
          <ThemeToggle />
        </span>
      </header>

      <p className="ws-eyebrow">Scaffold · WEB-1</p>
      <h1
        style={{ fontSize: 'clamp(30px, 5vw, 48px)', letterSpacing: '-0.035em', maxWidth: '20ch' }}
      >
        {SITE.tagline}
      </h1>
      <p style={{ color: 'var(--tx-2)', fontSize: 16, maxWidth: '60ch', marginTop: 16 }}>
        The documentation site is being built against <code>website.html</code>, the approved
        design. If this text is styled — dark background, violet accent, system sans — then the
        tokens, the static export and <code>basePath</code> are all correct.
      </p>

      <p style={{ marginTop: 40, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {(['--acc', '--add', '--del', '--mod', '--info'] as const).map((token) => (
          <span key={token} className="ws-swatch" style={{ background: `var(${token})` }}>
            <span>{token}</span>
          </span>
        ))}
      </p>
    </main>
  );
}
