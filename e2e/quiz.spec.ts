import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const uniqueEmail = () => `e2e+quiz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
const axe = async (page: Page) => expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
const progress = (page: Page) => page.getByRole('progressbar');

test('quiz-first: answers first, email last, with progress, back navigation and the answers saved', async ({
  page,
}) => {
  const bodies: Record<string, unknown>[] = [];
  const events: string[] = [];
  page.on('request', (req) => {
    const path = new URL(req.url()).pathname;
    if (req.method() === 'POST' && path === '/users') bodies.push(req.postDataJSON());
    if (path === '/api/e') events.push((req.postDataJSON() as { name: string }).name);
  });
  await page.goto('/variants/quiz');
  await expect(progress(page)).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await axe(page);

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('[role="alert"]', { hasText: 'Choose the option closest to you' })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeFocused();

  await page.getByRole('radio', { name: /Intermediate/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(progress(page)).toHaveAttribute('aria-valuenow', '2');
  await expect(page.getByRole('heading', { name: 'Which markets do you want to practise?' })).toBeFocused();
  await axe(page);

  await page.getByRole('checkbox', { name: 'Futures' }).check();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('radio', { name: /Intermediate/ })).toBeChecked();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('checkbox', { name: 'Futures' })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Metals' }).check();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(progress(page)).toHaveAttribute('aria-valuenow', '3');
  await expect(page.getByRole('heading', { name: 'Who should we create the free account for?' })).toBeFocused();
  await axe(page);
  await page.getByLabel(/First name/).fill('Quinn');
  await page.getByLabel('Email').fill(uniqueEmail());
  await page.getByRole('button', { name: 'Try FX Replay Free' }).click();

  await expect(page.getByRole('heading', { name: 'Your free account is ready' })).toBeFocused();
  expect(bodies[0]).toMatchObject({
    firstName: 'Quinn',
    experienceLevel: 'intermediate',
    markets: ['futures', 'metals'],
  });
  await expect
    .poll(() => events)
    .toEqual(expect.arrayContaining(['signup_started', 'quiz_step_completed', 'signup_submitted']));
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  // Name, level and markets are already saved, so there is no profile step after the quiz.
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByLabel(/First name/)).toHaveCount(0);
  await axe(page);
});

test('quiz-first: skipping markets sends no markets, and Back from the email step keeps the flow', async ({ page }) => {
  const bodies: Record<string, unknown>[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && new URL(req.url()).pathname === '/users') bodies.push(req.postDataJSON());
  });
  await page.goto('/variants/quiz');
  await page.getByRole('radio', { name: /Beginner/ }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  const email = uniqueEmail();
  await page.getByLabel(/First name/).fill('Rui');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(progress(page)).toHaveAttribute('aria-valuenow', '2');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByLabel('Email')).toHaveValue(email);
  await expect(page.getByLabel(/First name/)).toHaveValue('Rui');
  await page.getByRole('button', { name: 'Try FX Replay Free' }).click();
  await expect(page.getByRole('heading', { name: 'Your free account is ready' })).toBeVisible();
  expect(bodies[0]).toMatchObject({ firstName: 'Rui', experienceLevel: 'beginner' });
  expect(bodies[0]).not.toHaveProperty('markets');
});
