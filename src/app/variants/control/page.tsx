import type { Metadata } from 'next';
import { Landing } from '@/components/landing/Landing';
import { SignupForm } from '@/components/SignupForm';

// Control arm at a fixed URL, so it can be reviewed in production (where ?fxr_variant= is disabled).
// Visiting it moves the visitor to the control arm, like /variants/quiz does for the quiz. Canonical is /.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function ControlVariant() {
  return <Landing signup={<SignupForm />} />;
}
