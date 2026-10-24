import { SignupForm } from '@/components/SignupForm';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-6 px-4 py-12">
      <h1 className="font-display text-4xl font-black">Test your strategy before you trust it</h1>
      <p className="text-text-secondary">Walking skeleton. The landing page arrives in Stage 5.</p>
      <a
        href="#signup"
        className="rounded-full bg-btn-primary px-6 py-3 font-display font-bold text-btn-text hover:bg-btn-primary-hover"
      >
        Try FX Replay Free
      </a>
      <section id="signup" aria-labelledby="signup-title" className="flex w-full flex-col gap-4 pt-8">
        <h2 id="signup-title" className="font-display text-2xl font-bold">
          Create your free account
        </h2>
        <SignupForm />
      </section>
    </main>
  );
}
