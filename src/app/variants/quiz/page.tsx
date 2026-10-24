import type { Metadata } from 'next';
import { Landing } from '@/components/landing/Landing';
import { QuizSignup } from '@/components/QuizSignup';

// Variant: quiz-first signup (ADR-011). Static like the control; Stage 6 serves it at / to its half of visitors.
// No noindex: once / serves this page to half of visitors, crawlers included, noindex would de-index the home
// page. The canonical points at / so search engines treat it as the same page.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function QuizVariant() {
  return <Landing signup={<QuizSignup />} />;
}
