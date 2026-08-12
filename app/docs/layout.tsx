import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader current="/docs" />
      {children}
      <SiteFooter />
    </>
  );
}
