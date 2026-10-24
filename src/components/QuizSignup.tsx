'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { EXPERIENCE_LEVELS, MARKETS } from '@/contracts/users';
import type { SignupAnswers } from '@/lib/api';
import { SignupForm } from './SignupForm';

// Quiz-first variant (ADR-011): two quick questions, then the email. Conversion is still the POST /users.
const TOTAL_STEPS = 3;

const LEVELS: Record<(typeof EXPERIENCE_LEVELS)[number], { label: string; hint: string }> = {
  beginner: { label: 'Beginner', hint: 'Learning how markets move' },
  intermediate: { label: 'Intermediate', hint: 'Trading a strategy, refining it' },
  advanced: { label: 'Advanced', hint: 'Stress-testing a proven process' },
};
const MARKET_LABELS: Record<(typeof MARKETS)[number], string> = {
  forex: 'Forex',
  futures: 'Futures',
  stocks: 'Stocks',
  crypto: 'Crypto',
  indices: 'Indices',
  metals: 'Metals',
};

const option =
  'lift flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-input-border bg-bg-secondary px-4 py-3 has-[:checked]:border-focus has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus';
const primary =
  'lift min-h-12 grow rounded-full bg-btn-primary px-6 font-heading font-bold text-btn-text hover:bg-btn-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const secondary =
  'lift min-h-12 rounded-full border border-input-border px-6 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export function QuizSignup() {
  const ids = { progress: useId(), title: useId() };
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<SignupAnswers>({});
  // Kept here so Back from the email step doesn't lose what was typed (WCAG 3.3.7).
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // Move focus to each new step's question (not on first render, so the page doesn't jump).
  useEffect(() => {
    if (moved.current) titleRef.current?.focus();
  }, [step]);

  const go = (next: number) => {
    moved.current = true;
    setError(null);
    setStep(next);
  };

  function submitLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const level = new FormData(event.currentTarget).get('experienceLevel');
    if (!level) {
      setError('Choose the option closest to you.');
      return;
    }
    setAnswers((a) => ({ ...a, experienceLevel: level as NonNullable<SignupAnswers['experienceLevel']> }));
    go(2);
  }

  function saveMarkets(data: FormData) {
    const markets = data.getAll('markets') as NonNullable<SignupAnswers['markets']>;
    setAnswers((a) => {
      const next = { ...a };
      if (markets.length) next.markets = markets;
      else delete next.markets;
      return next;
    });
  }

  function submitMarkets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMarkets(new FormData(event.currentTarget));
    go(3);
  }

  const titles = [
    'How would you describe your trading?',
    'Which markets do you want to practise?',
    'Where should we create your free account?',
  ];

  return (
    <div className="flex w-full max-w-md flex-col gap-5">
      {done ? null : (
        <>
          <div className="flex flex-col gap-2">
            <p id={ids.progress} className="text-sm text-text-secondary">
              Step {step} of {TOTAL_STEPS}
            </p>
            <div
              role="progressbar"
              aria-labelledby={ids.progress}
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-valuenow={step}
              className="h-1.5 overflow-hidden rounded-full bg-bg-tertiary"
            >
              <div
                className="progress-fill h-full rounded-full bg-btn-primary"
                style={{ transform: `scaleX(${step / TOTAL_STEPS})` }}
              />
            </div>
          </div>

          <h3
            id={ids.title}
            ref={titleRef}
            tabIndex={-1}
            className="font-heading text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {titles[step - 1]}
          </h3>
        </>
      )}

      <div key={step} className="step-enter">
        {step === 1 ? (
          <form onSubmit={submitLevel} noValidate className="flex flex-col gap-3" aria-labelledby={ids.title}>
            <fieldset
              className="flex flex-col gap-3"
              aria-describedby={error ? `${ids.title}-error` : undefined}
              onChange={() => setError(null)}
              role="radiogroup"
              aria-invalid={error ? true : undefined}
            >
              <legend className="sr-only">{titles[0]}</legend>
              {EXPERIENCE_LEVELS.map((level) => (
                <label key={level} className={option}>
                  <input
                    type="radio"
                    name="experienceLevel"
                    value={level}
                    defaultChecked={answers.experienceLevel === level}
                    className="accent-link"
                  />
                  <span className="flex flex-col">
                    <span className="font-bold">{LEVELS[level].label}</span>
                    <span className="text-sm text-text-secondary">{LEVELS[level].hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <p id={`${ids.title}-error`} role="alert" className="min-h-6 text-sm text-error-text">
              {error ? (
                <>
                  <span aria-hidden="true">⚠ </span>
                  {error}
                </>
              ) : null}
            </p>
            <button type="submit" className={primary}>
              Continue
            </button>
          </form>
        ) : null}

        {step === 2 ? (
          <form onSubmit={submitMarkets} noValidate className="flex flex-col gap-3" aria-labelledby={ids.title}>
            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="sr-only">{titles[1]}</legend>
              {MARKETS.map((market) => (
                <label key={market} className={option}>
                  <input
                    type="checkbox"
                    name="markets"
                    value={market}
                    defaultChecked={answers.markets?.includes(market)}
                    className="accent-link"
                  />
                  {MARKET_LABELS[market]}
                </label>
              ))}
            </fieldset>
            <p className="text-sm text-text-secondary">Pick any, or none.</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  if (form) saveMarkets(new FormData(form));
                  go(1);
                }}
                className={secondary}
              >
                Back
              </button>
              <button type="submit" className={primary}>
                Continue
              </button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <SignupForm
            answers={answers}
            onBack={() => go(2)}
            initialEmail={email}
            onEmailChange={setEmail}
            onSuccess={() => setDone(true)}
          />
        ) : null}
      </div>
    </div>
  );
}
