'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { createUserSchema } from '@/contracts/users';
import { createUser, type ApiResult } from '@/lib/api';
import type { User } from '@/contracts/users';
import { ProfileStep } from './ProfileStep';

type Status = 'idle' | 'submitting' | 'error' | 'success';

const COPY = {
  required: 'Enter your email address.',
  invalid: 'Enter a valid email address, like you@example.com.',
  taken: 'This email already has an account. Try a different email.',
  timeout: "This is taking longer than usual. Trying again won't create a second account.",
  failed: "We couldn't create your account. Please try again.",
};

function validate(value: string): string | null {
  if (!value.trim()) return COPY.required;
  return createUserSchema.safeParse({ email: value }).success ? null : COPY.invalid;
}

function messageFor(result: Exclude<ApiResult<unknown>, { ok: true }>): {
  field?: string;
  form?: string;
  retry: boolean;
  resetKey?: boolean;
} {
  if (result.kind === 'timeout') return { form: COPY.timeout, retry: true };
  if (result.kind === 'network') return { form: COPY.failed, retry: true };
  if (result.error.code === 'EMAIL_TAKEN') return { field: COPY.taken, retry: false };
  // The key was used for another body: the retry must start a fresh attempt with a new key.
  if (result.error.code === 'IDEMPOTENCY_CONFLICT') return { form: COPY.failed, retry: true, resetKey: true };
  if (result.error.code === 'VALIDATION_FAILED')
    return { field: result.error.fields?.email ?? COPY.invalid, retry: false };
  return { form: COPY.failed, retry: true };
}

export function SignupForm() {
  const ids = { email: useId(), error: useId(), status: useId(), note: useId() };
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [user, setUser] = useState<User | null>(null);
  const inFlight = useRef(false);
  // One key per signup attempt: a retry after a timeout replays the same request instead of creating twice.
  const attempt = useRef<{ email: string; key: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (inFlight.current) return; // double-submit guard: ignores clicks while a request is in flight
    const problem = validate(email);
    if (problem) {
      setFieldError(problem);
      inputRef.current?.focus();
      return;
    }
    const normalised = email.trim().toLowerCase();
    if (attempt.current?.email !== normalised) attempt.current = { email: normalised, key: crypto.randomUUID() };

    inFlight.current = true;
    setStatus('submitting');
    setFieldError(null);
    setFormError(null);
    const result = await createUser(normalised, attempt.current.key);
    inFlight.current = false;

    if (result.ok) {
      setUser(result.data.user);
      setStatus('success');
      requestAnimationFrame(() => successRef.current?.focus());
      return;
    }
    const message = messageFor(result);
    if (message.resetKey) attempt.current = null;
    setStatus('error');
    if (message.field) {
      setFieldError(message.field);
      inputRef.current?.focus();
    } else {
      setFormError(message.form ?? COPY.failed);
      requestAnimationFrame(() => formErrorRef.current?.focus());
    }
  }

  if (status === 'success' && user) {
    return (
      <section aria-labelledby={`${ids.status}-title`} className="flex w-full max-w-md flex-col gap-4">
        <h2
          id={`${ids.status}-title`}
          ref={successRef}
          tabIndex={-1}
          className="font-heading text-2xl font-bold outline-none"
        >
          Your free account is ready
        </h2>
        <ProfileStep userId={user.id} />
      </section>
    );
  }

  const busy = status === 'submitting';
  return (
    <form onSubmit={submit} noValidate aria-describedby={ids.note} className="flex w-full max-w-md flex-col gap-3">
      <label htmlFor={ids.email} className="font-heading font-bold">
        Email
      </label>
      <input
        ref={inputRef}
        id={ids.email}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (fieldError) setFieldError(null);
        }}
        onBlur={() => email && setFieldError(validate(email))}
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? ids.error : undefined}
        className="min-h-12 rounded-lg border border-input-border bg-bg-secondary px-4 text-base text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      <p id={ids.error} role="alert" className="min-h-6 text-sm text-error-text">
        {fieldError ? (
          <>
            <span aria-hidden="true">⚠ </span>
            {fieldError}
          </>
        ) : null}
      </p>
      <button
        type="submit"
        aria-disabled={busy || undefined}
        aria-busy={busy || undefined}
        className="min-h-12 rounded-full bg-btn-primary px-6 font-heading font-bold text-btn-text hover:bg-btn-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-disabled:cursor-progress"
      >
        {busy ? 'Creating your account…' : 'Try FX Replay Free'}
      </button>
      <div aria-live="polite" className="min-h-6">
        {formError ? (
          <p
            ref={formErrorRef}
            tabIndex={-1}
            className="flex flex-wrap items-center gap-3 text-sm text-error-text outline-none"
          >
            <span>
              <span aria-hidden="true">⚠ </span>
              {formError}
            </span>
            <button
              type="button"
              onClick={() => submit()}
              className="min-h-11 rounded-full border border-input-border px-4 font-bold text-text-primary"
            >
              Try again
            </button>
          </p>
        ) : null}
      </div>
      <p id={ids.note} className="text-sm text-text-secondary">
        Free plan. No credit card required. By submitting this form, you confirm that you have read and agree to FX
        Replay&apos;s{' '}
        <a className="text-link underline" href="https://fxreplay.com/legal-regulatory/terms-conditions">
          Terms of Service
        </a>{' '}
        and{' '}
        <a className="text-link underline" href="https://fxreplay.com/legal-regulatory/privacy-policy">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
