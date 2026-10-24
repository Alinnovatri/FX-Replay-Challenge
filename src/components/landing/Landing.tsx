import Image from 'next/image';
import type { ReactNode } from 'react';
import { CTA_LABEL, faq, features, finalCta, footer, hero, plan, problem, meta } from '@/content/landing';

const cta =
  'lift inline-flex min-h-12 items-center justify-center rounded-full bg-btn-primary px-6 font-heading font-bold text-btn-text hover:bg-btn-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

// Structured data for the product being promoted. Free offer only (A-003).
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'FX Replay',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web browser',
  description: meta.description,
  // The app lives at fxreplay.com; this page only promotes it (A-004).
  url: 'https://fxreplay.com/',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free plan, no credit card required' },
};

/** The landing page. `signup` is the variant under test: email-first (control) or quiz-first (ADR-011). */
export function Landing({ signup }: { signup: ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a
        href="#signup"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-bg-secondary focus:p-3"
      >
        Skip to signup
      </a>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        {/* Copied from brand/logos by scripts/brand/sync-assets.mjs. */}
        <Image
          src="/brand/fx-replay-logo.svg"
          alt="FX Replay"
          width={154}
          height={20}
          className="h-5 w-auto"
          unoptimized
        />
        <a href="#signup" className={`${cta} min-h-11 px-5 text-sm`}>
          {CTA_LABEL}
        </a>
      </header>

      <main>
        <section className="hero relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 pt-8 pb-16 md:grid-cols-[1.1fr_1fr] md:pt-16 md:pb-24">
            <div className="flex flex-col gap-5">
              <p
                className="reveal text-sm font-bold tracking-wide text-link uppercase"
                style={{ '--d': '0ms' } as React.CSSProperties}
              >
                {hero.eyebrow}
              </p>
              {/* The LCP element: never animated. */}
              <h1 className="font-heading text-4xl leading-tight font-black text-balance md:text-6xl">{hero.title}</h1>
              <p
                className="reveal max-w-xl text-lg text-text-secondary"
                style={{ '--d': '80ms' } as React.CSSProperties}
              >
                {hero.subtitle}
              </p>
              <p className="reveal text-sm text-text-secondary" style={{ '--d': '160ms' } as React.CSSProperties}>
                {hero.proof}
              </p>
            </div>
            <div
              id="signup"
              className="reveal scroll-mt-6 rounded-2xl border border-input-border bg-bg-secondary/80 p-6 shadow-2xl md:p-8"
              style={{ '--d': '120ms' } as React.CSSProperties}
            >
              <h2 className="mb-4 font-heading text-2xl font-bold">Create your free account</h2>
              {signup}
            </div>
          </div>
        </section>

        <section className="on-scroll mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="font-heading text-3xl font-bold text-balance">{problem.title}</h2>
          <p className="mt-4 text-lg text-text-secondary">{problem.body}</p>
        </section>

        <section aria-labelledby="plan-title" className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="plan-title" className="on-scroll font-heading text-3xl font-bold">
            {plan.title}
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {plan.steps.map((step, i) => (
              <li
                key={step.title}
                className="on-scroll card rounded-2xl border border-input-border bg-bg-secondary p-6"
              >
                <span aria-hidden="true" className="font-heading text-3xl font-black text-link">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-heading text-xl font-bold">{step.title}</h3>
                <p className="mt-2 text-text-secondary">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="features-title" className="mx-auto max-w-6xl px-4 py-16">
          <h2 id="features-title" className="on-scroll font-heading text-3xl font-bold">
            {features.title}
          </h2>
          <p className="on-scroll mt-3 text-text-secondary">{features.coverage}</p>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {features.items.map((item) => (
              <li
                key={item.title}
                className="on-scroll card rounded-2xl border border-input-border bg-bg-secondary p-6"
              >
                <h3 className="font-heading text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-text-secondary">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 py-16">
          <h2 id="faq-title" className="on-scroll font-heading text-3xl font-bold">
            {faq.title}
          </h2>
          <div className="mt-6 flex flex-col gap-3">
            {faq.items.map((item) => (
              <details
                key={item.q}
                className="on-scroll group rounded-2xl border border-input-border bg-bg-secondary p-5"
              >
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                  {item.q}
                  <span aria-hidden="true" className="chevron text-link">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-text-secondary">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="on-scroll mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="font-heading text-3xl font-bold">{finalCta.title}</h2>
          <p className="mt-3 text-lg text-text-secondary">{finalCta.body}</p>
          <a href="#signup" className={`${cta} mt-6`}>
            {CTA_LABEL}
          </a>
        </section>
      </main>

      <footer className="border-t border-input-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-sm text-text-secondary">
          <p>
            {footer.disclosure}{' '}
            <a className="text-link underline" href="https://fxreplay.com/">
              Full risk disclosure on fxreplay.com
            </a>
          </p>
          <p>
            {footer.note}{' '}
            <a className="text-link underline" href="https://fxreplay.com/">
              FX Replay
            </a>{' '}
            ·{' '}
            <a className="text-link underline" href="https://fxreplay.com/legal-regulatory/terms-conditions">
              Terms of Service
            </a>{' '}
            ·{' '}
            <a className="text-link underline" href="https://fxreplay.com/legal-regulatory/privacy-policy">
              Privacy Policy
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
