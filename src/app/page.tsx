export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-6 px-4">
      <h1 className="font-display text-4xl font-black">Test your strategy before you trust it</h1>
      <p className="text-text-secondary">Walking skeleton. The landing page arrives in Stage 5.</p>
      <a
        href="#signup"
        className="rounded-full bg-btn-primary px-6 py-3 font-display font-bold text-btn-text hover:bg-btn-primary-hover"
      >
        Try FX Replay Free
      </a>
    </main>
  );
}
