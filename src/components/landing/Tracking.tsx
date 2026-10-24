'use client';

import { useEffect, type ReactNode } from 'react';
import type { CTA_IDS } from '@/contracts/events';
import { track } from '@/lib/track';

/** Sends landing_viewed once per page load. */
export function PageView() {
  useEffect(() => {
    track('landing_viewed', {});
  }, []);
  return null;
}

/** An anchor that reports cta_clicked with a typed id, then follows its link as usual. */
export function TrackedLink({
  ctaId,
  href,
  className,
  children,
}: {
  ctaId: (typeof CTA_IDS)[number];
  href: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <a href={href} className={className} onClick={() => track('cta_clicked', { cta_id: ctaId })}>
      {children}
    </a>
  );
}
