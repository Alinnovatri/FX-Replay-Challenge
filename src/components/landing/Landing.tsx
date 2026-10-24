import Image from 'next/image';
import type { ReactNode } from 'react';
import {
  CTA_LABEL,
  audience,
  benefits,
  faq,
  finalCta,
  footer,
  hero,
  meta,
  plan,
  showcase,
  trust,
} from '@/content/landing';
// Product screenshots from FX Replay (brand/screenshots/SOURCES.md); statically imported so Next.js knows their
// size (no layout shift) and serves resized WebP.
import heroShot from '../../../brand/screenshots/hero-poster.webp';
import journalShot from '../../../brand/screenshots/backtest.webp';
import replayShot from '../../../brand/screenshots/replay.webp';
import { Icon, type IconName } from './Icon';
import { PageView, TrackedLink } from './Tracking';

const cta =
  'lift inline-flex min-h-12 items-center justify-center rounded-full bg-btn-primary px-6 font-heading font-bold text-btn-text hover:bg-btn-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const ghost =
  'lift inline-flex min-h-12 items-center justify-center rounded-full border border-input-border px-6 font-heading font-bold hover:border-focus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

// Structured data for the product being promoted. Free offer only (A-003); the app lives at fxreplay.com (A-004).
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'FX Replay',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web browser',
  description: meta.description,
  url: 'https://fxreplay.com/',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Free plan, no credit card required' },
};

const benefitIcons: Record<string, IconName> = {
  replay: 'play',
  journal: 'book',
  prop: 'shield',
  mentor: 'sparkles',
  script: 'code',
};

function SectionTitle({ id, children, intro }: { id: string; children: ReactNode; intro?: string }) {
  return (
    <div className="on-scroll max-w-2xl">
      <h2 id={id} className="font-heading text-3xl font-bold text-balance md:text-4xl">
        {children}
      </h2>
      {intro ? <p className="mt-3 text-lg text-text-secondary">{intro}</p> : null}
    </div>
  );
}

/** The landing page. `signup` is the arm under test: email-first (control) or quiz-first (ADR-011). */
export function Landing({ signup }: { signup: ReactNode }) {
  return (
    <>
      <PageView />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a
        href="#signup"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-10 focus:rounded focus:bg-bg-secondary focus:p-3"
      >
        Skip to signup
      </a>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Image
          src="/brand/fx-replay-logo.svg"
          alt="FX Replay"
          width={154}
          height={20}
          className="h-5 w-auto"
          unoptimized
          loading="eager"
        />
        <TrackedLink ctaId="header" href="#signup" className={`${cta} min-h-11 px-5 text-sm`}>
          {CTA_LABEL}
        </TrackedLink>
      </header>

      <main>
        {/* Hero: value proposition and the signup form, both visible without scrolling. */}
        <section className="hero relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 pt-8 pb-12 md:grid-cols-[1.1fr_1fr] md:pt-14">
            <div className="flex flex-col gap-5 md:pt-6">
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
              <div className="reveal flex flex-wrap gap-3" style={{ '--d': '140ms' } as React.CSSProperties}>
                <a href="#how" className={ghost}>
                  {hero.secondaryCta}
                </a>
              </div>
            </div>
            <div
              id="signup"
              className="reveal glass scroll-mt-6 rounded-2xl border border-input-border p-6 shadow-2xl md:p-8"
              style={{ '--d': '120ms' } as React.CSSProperties}
            >
              <h2 className="mb-4 font-heading text-2xl font-bold">Create your free account</h2>
              {signup}
            </div>
          </div>
        </section>

        {/* Trust strip: sourced numbers only (A-003). */}
        <section aria-label="FX Replay at a glance" className="border-y border-input-border bg-bg-secondary">
          <dl className="mx-auto grid max-w-6xl grid-cols-3 gap-4 px-4 py-6 text-center">
            {trust.map((item) => (
              <div key={item.label} className="flex flex-col-reverse gap-1">
                <dt className="text-sm text-text-secondary">{item.label}</dt>
                <dd className="font-heading text-2xl font-black md:text-3xl">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Product showcase: the real interface, large. */}
        <section aria-labelledby="showcase-title" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <SectionTitle id="showcase-title" intro={showcase.body}>
            {showcase.title}
          </SectionTitle>
          <figure className="on-scroll window mt-10 overflow-hidden rounded-2xl border border-input-border">
            <div
              aria-hidden="true"
              className="flex items-center gap-2 border-b border-input-border bg-bg-secondary px-4 py-3"
            >
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <Image
              src={heroShot}
              alt={showcase.alt}
              sizes="(min-width: 1152px) 1120px, 100vw"
              className="h-auto w-full"
              placeholder="blur"
            />
            <figcaption className="flex flex-wrap gap-2 border-t border-input-border bg-bg-secondary px-4 py-3">
              {showcase.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-input-border px-3 py-1 text-sm text-text-secondary"
                >
                  {chip}
                </span>
              ))}
            </figcaption>
          </figure>
        </section>

        {/* Benefits as a bento: one large tile with the journal screenshot, smaller tiles around it. */}
        <section aria-labelledby="benefits-title" className="mx-auto max-w-6xl px-4 py-16">
          <SectionTitle id="benefits-title" intro={benefits.intro}>
            {benefits.title}
          </SectionTitle>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {benefits.items.map((item) => (
              <li
                key={item.id}
                className={`on-scroll card flex flex-col gap-3 rounded-2xl border border-input-border bg-bg-secondary p-6 ${
                  item.id === 'journal' ? 'md:col-span-2 md:row-span-2' : item.id === 'script' ? 'md:col-span-2' : ''
                }`}
              >
                <span className="icon-badge" aria-hidden="true">
                  <Icon name={benefitIcons[item.id] ?? 'play'} />
                </span>
                <h3 className="font-heading text-xl font-bold">{item.title}</h3>
                <p className="text-text-secondary">{item.body}</p>
                {item.id === 'journal' && 'alt' in item ? (
                  <div className="mt-auto overflow-hidden rounded-xl border border-input-border">
                    <div className="crop-journal">
                      <Image src={journalShot} alt={item.alt} sizes="(min-width: 768px) 1030px, 143vw" loading="lazy" />
                    </div>
                    <p className="border-t border-input-border px-3 py-2 text-xs text-text-secondary">Sample data</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* How it works: three steps, the middle one with the real replay controls. */}
        <section id="how" aria-labelledby="plan-title" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16">
          <SectionTitle id="plan-title">{plan.title}</SectionTitle>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {plan.steps.map((step, i) => (
              <li
                key={step.title}
                className="on-scroll card flex flex-col gap-3 rounded-2xl border border-input-border bg-bg-secondary p-6"
              >
                <span aria-hidden="true" className="step-number">
                  {i + 1}
                </span>
                <h3 className="font-heading text-xl font-bold">{step.title}</h3>
                <p className="text-text-secondary">{step.body}</p>
                {'alt' in step ? (
                  <Image
                    src={replayShot}
                    alt={step.alt}
                    sizes="(min-width: 768px) 320px, 100vw"
                    className="mt-auto h-auto w-full rounded-lg"
                    loading="lazy"
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        {/* Who it's for: the questions each kind of trader brings, answered with what the product does. */}
        <section aria-labelledby="audience-title" className="mx-auto max-w-6xl px-4 py-16">
          <SectionTitle id="audience-title">{audience.title}</SectionTitle>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {audience.items.map((item) => (
              <article key={item.q} className="on-scroll quote-card rounded-2xl border border-input-border p-6">
                <p className="text-sm font-bold text-link">{item.who}</p>
                <h3 className="mt-3 font-heading text-xl font-bold">{item.q}</h3>
                <p className="mt-3 text-text-secondary">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 py-16">
          <SectionTitle id="faq-title">{faq.title}</SectionTitle>
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

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="final-cta on-scroll relative overflow-hidden rounded-3xl border border-input-border px-6 py-14 text-center md:py-20">
            <h2 className="font-heading text-3xl font-bold text-balance md:text-4xl">{finalCta.title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-text-secondary">{finalCta.body}</p>
            <TrackedLink ctaId="final" href="#signup" className={`${cta} mt-8`}>
              {CTA_LABEL}
            </TrackedLink>
          </div>
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
