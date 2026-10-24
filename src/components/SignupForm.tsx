'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createUserSchema } from '@/contracts/users';
import { createUser, type ApiResult, type SignupAnswers } from '@/lib/api';
import type { User } from '@/contracts/users';
import { ProfileStep } from './ProfileStep';
import { track } from '@/lib/track';
import type { SIGNUP_ERROR_CODES } from '@/contracts/events';

type Status = 'idle' | 'submitting' | 'error' | 'success';

const COPY = {
  required: 'Enter your email address.',
  invalid: 'Enter a valid email address, like you@example.com.',
  taken: 'This email already has an account. Try a different email.',
  timeout: "This is taking longer than usual. Trying again won't create a second account.",
  failed: "We couldn't create your account. Please try again.",
  name: 'Check your first name and submit again.',
};

function errorCode(result: Exclude<ApiResult<unknown>, { ok: true }>): (typeof SIGNUP_ERROR_CODES)[number] {
  if (result.kind === 'timeout') return 'TIMEOUT';
  if (result.kind === 'network') return 'NETWORK';
  const code = result.error.code;
  return code === 'VALIDATION_FAILED' || code === 'EMAIL_TAKEN' || code === 'IDEMPOTENCY_CONFLICT' ? code : 'INTERNAL';
}

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
  if (result.error.code === 'VALIDATION_FAILED') {
    const email = result.error.fields?.email;
    // A rejected first name is not an email problem: show the first-name form message instead.
    return email ? { field: email, retry: false } : { form: COPY.name, retry: false };
  }
  return { form: COPY.failed, retry: true };
}

/**
 * Email signup. Used alone (control) or as the last step of the quiz-first variant, which passes the answers it
 * collected and a Back handler.
 */
export function SignupForm({
  answers,
  onBack,
  initialEmail = '',
  initialName = '',
  onNameChange,
  onEmailChange,
  onSuccess,
}: {
  answers?: SignupAnswers;
  onBack?: () => void;
  initialEmail?: string;
  initialName?: string;
  onNameChange?: (name: string) => void;
  onEmailChange?: (email: string) => void;
  onSuccess?: () => void;
} = {}) {
  const ids = { name: useId(), email: useId(), error: useId(), status: useId(), note: useId() };
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState(initialName);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(true);
  const [status, setStatus] = useState<Status>('idle');
  const [user, setUser] = useState<User | null>(null);
  const inFlight = useRef(false);
  const started = useRef(Boolean(answers));
  // signup_started fires once, on the first focus of either field (name or email).
  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    track('signup_started', {});
  };
  // One key per signup attempt: a retry after a timeout replays the same request instead of creating twice.
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  // Focus moves after React commits the new state, so the target always exists when focused.
  const [focusTarget, setFocusTarget] = useState<'success' | 'formError' | null>(null);
  useEffect(() => {
    if (focusTarget === 'success') successRef.current?.focus();
    if (focusTarget === 'formError') formErrorRef.current?.focus();
  }, [focusTarget, formError]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (inFlight.current) return; // double-submit guard: ignores clicks while a request is in flight
    const problem = validate(email);
    if (problem) {
      setFieldError(problem);
      inputRef.current?.focus();
      return;
    }
    track('signup_submitted', {});
    const normalised = email.trim().toLowerCase();
    const name = firstName.trim();
    const fingerprint = JSON.stringify({ email: normalised, answers, name });
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };

    inFlight.current = true;
    setStatus('submitting');
    setFieldError(null);
    setFormError(null);
    setFocusTarget(null);
    const result = await createUser(normalised, attempt.current.key, answers, name);
    inFlight.current = false;

    if (result.ok) {
      setUser(result.data.user);
      setStatus('success');
      onSuccess?.();
      setFocusTarget('success');
      return;
    }
    track('signup_failed', { error_code: errorCode(result) });
    const message = messageFor(result);
    if (message.resetKey) attempt.current = null;
    setCanRetry(message.retry);
    setStatus('error');
    if (message.field) {
      setFieldError(message.field);
      inputRef.current?.focus();
    } else {
      setFormError(message.form ?? COPY.failed);
      setFocusTarget('formError');
    }
  }

  if (status === 'success' && user) {
    return (
      <section aria-labelledby={`${ids.status}-title`} className="flex w-full max-w-md flex-col gap-4">
        <h2
          id={`${ids.status}-title`}
          ref={successRef}
          tabIndex={-1}
          className="font-heading text-2xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Your free account is ready
        </h2>
        {/* A-004: be clear about what this account is, right after the conversion. */}
        <p className="text-sm text-text-secondary">
          This account was created for the FX Replay Growth Engineer challenge. It does not sign you in to the FX Replay
          app.
        </p>
        {/* The quiz already collected level and markets; the control asks for them here, optionally. */}
        {answers ? null : <ProfileStep userId={user.id} />}
      </section>
    );
  }

  const busy = status === 'submitting';
  return (
    <form onSubmit={submit} noValidate aria-describedby={ids.note} className="flex w-full max-w-md flex-col gap-3">
      <label htmlFor={ids.name} className="font-heading font-bold">
        First name <span className="font-body font-normal text-text-secondary">(optional)</span>
      </label>
      <input
        id={ids.name}
        name="firstName"
        autoComplete="given-name"
        maxLength={50}
        value={firstName}
        onFocus={markStarted}
        onChange={(e) => {
          setFirstName(e.target.value);
          onNameChange?.(e.target.value);
        }}
        className="mb-2 min-h-12 rounded-lg border border-input-border bg-bg-secondary px-4 text-base text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
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
        onFocus={markStarted}
        onChange={(e) => {
          setEmail(e.target.value);
          onEmailChange?.(e.target.value);
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
      <div className="flex flex-wrap gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="lift min-h-12 rounded-full border border-input-border px-6 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Back
          </button>
        ) : null}
        <button
          ref={submitRef}
          type="submit"
          aria-disabled={busy || undefined}
          aria-busy={busy || undefined}
          className="lift grow min-h-12 rounded-full bg-btn-primary px-6 font-heading font-bold text-btn-text hover:bg-btn-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-disabled:cursor-progress"
        >
          {busy ? 'Creating your account…' : 'Try FX Replay Free'}
        </button>
      </div>
      {/* Announces progress; the visible label change alone isn't announced unless the button has focus. */}
      <p role="status" className="sr-only">
        {busy ? 'Creating your account…' : ''}
      </p>
      {formError ? (
        <div className="flex flex-wrap items-center gap-3">
          {/* Focused when it appears, which announces it; no live region, so it isn't read twice. */}
          <p
            ref={formErrorRef}
            tabIndex={-1}
            className="text-sm text-error-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span aria-hidden="true">⚠ </span>
            {formError}
          </p>
          {canRetry ? (
            <button
              type="button"
              onClick={() => {
                // Keep focus on a stable control: this button unmounts when the retry clears the error.
                submitRef.current?.focus();
                void submit();
              }}
              className="min-h-11 rounded-full border border-input-border px-4 font-bold text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
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
