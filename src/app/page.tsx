import { SignupForm } from '@/components/SignupForm';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-6 px-4 py-12">
      <h1 className="font-heading text-4xl font-black">Test your strategy before you trust it</h1>
      <p className="text-text-secondary">
        Replay real historical price data, test a strategy and practise execution without risking real money.
      </p>
      <a
        href="#signup"
        className="rounded-full bg-btn-primary px-6 py-3 font-heading font-bold text-btn-text hover:bg-btn-primary-hover"
      >
        Try FX Replay Free
      </a>
      <section id="signup" aria-labelledby="signup-title" className="flex w-full flex-col gap-4 pt-8">
        <h2 id="signup-title" className="font-heading text-2xl font-bold">
          Create your free account
        </h2>
        <SignupForm />
      </section>
    </main>
  );
}
