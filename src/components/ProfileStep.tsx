'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { EXPERIENCE_LEVELS, MARKETS, profileUpdateSchema } from '@/contracts/users';
import { updateProfile } from '@/lib/api';

type Status = 'editing' | 'saving' | 'saved' | 'skipped' | 'error';

const LEVEL_LABELS: Record<(typeof EXPERIENCE_LEVELS)[number], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
const MARKET_LABELS: Record<(typeof MARKETS)[number], string> = {
  forex: 'Forex',
  futures: 'Futures',
  stocks: 'Stocks',
  crypto: 'Crypto',
  indices: 'Indices',
  metals: 'Metals',
};

/** Optional step after signup. The conversion is already counted; this only enriches the profile. */
export function ProfileStep({ userId }: { userId: string }) {
  const ids = { name: useId(), level: useId(), markets: useId() };
  const [status, setStatus] = useState<Status>('editing');
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const doneRef = useRef<HTMLParagraphElement>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    const firstName = String(data.get('firstName') ?? '').trim();
    const experienceLevel = data.get('experienceLevel');
    const markets = data.getAll('markets');
    const changes = {
      ...(firstName ? { firstName } : {}),
      ...(experienceLevel ? { experienceLevel } : {}),
      ...(markets.length ? { markets } : {}),
    };
    if (Object.keys(changes).length === 0) {
      setError('Fill in at least one answer, or skip this step.');
      return;
    }
    if (!profileUpdateSchema.safeParse(changes).success) {
      setError('Check your answers and try again.');
      return;
    }
    inFlight.current = true;
    setStatus('saving');
    setError(null);
    const result = await updateProfile(userId, changes);
    inFlight.current = false;
    if (result.ok) {
      setStatus('saved');
      requestAnimationFrame(() => doneRef.current?.focus());
    } else {
      setStatus('error');
      setError(
        result.kind === 'http' && result.status === 401
          ? 'Your session expired. Your account is created; you can skip this step.'
          : "We couldn't save your answers. Please try again, or skip this step.",
      );
    }
  }

  if (status === 'saved' || status === 'skipped') {
    return (
      <p ref={doneRef} tabIndex={-1} className="text-text-secondary outline-none">
        {status === 'saved' ? 'Profile saved. Thanks.' : 'No problem. You can add these details later.'}
      </p>
    );
  }

  const busy = status === 'saving';
  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4">
      <p className="text-text-secondary">Tell us how you trade, or skip this step. Everything here is optional.</p>
      <div className="flex flex-col gap-2">
        <label htmlFor={ids.name} className="font-bold">
          First name <span className="font-normal text-text-secondary">(optional)</span>
        </label>
        <input
          id={ids.name}
          name="firstName"
          autoComplete="given-name"
          maxLength={50}
          className="min-h-12 rounded-lg border border-input-border bg-bg-secondary px-4 text-base"
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">Experience level</legend>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_LEVELS.map((level) => (
            <label
              key={level}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-input-border px-4"
            >
              <input type="radio" name="experienceLevel" value={level} />
              {LEVEL_LABELS[level]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">Markets you want to practise</legend>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((market) => (
            <label
              key={market}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-input-border px-4"
            >
              <input type="checkbox" name="markets" value={market} />
              {MARKET_LABELS[market]}
            </label>
          ))}
        </div>
      </fieldset>
      <div aria-live="polite" className="min-h-6 text-sm text-error-text">
        {error ? (
          <>
            <span aria-hidden="true">⚠ </span>
            {error}
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          aria-disabled={busy || undefined}
          aria-busy={busy || undefined}
          className="min-h-12 rounded-full bg-btn-primary px-6 font-display font-bold text-btn-text hover:bg-btn-primary-hover"
        >
          {busy ? 'Saving…' : 'Save profile'}
        </button>
        <button
          type="button"
          onClick={() => {
            setStatus('skipped');
            requestAnimationFrame(() => doneRef.current?.focus());
          }}
          className="min-h-12 rounded-full border border-input-border px-6 font-bold"
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}
