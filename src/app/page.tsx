import { Landing } from '@/components/landing/Landing';
import { SignupForm } from '@/components/SignupForm';

// Control: email-first signup. The quiz-first variant lives at /variants/quiz (ADR-011).
export default function Home() {
  return <Landing signup={<SignupForm />} />;
}
