import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const uniqueEmail = (label: string) =>
  `e2e+${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

/** Records POST /users requests the page makes, so tests can count them and read their headers. */
function trackSignupRequests(page: Page) {
  const requests: { key: string | undefined }[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && new URL(req.url()).pathname === '/users') {
      requests.push({ key: req.headers()['idempotency-key'] });
    }
  });
  return requests;
}

const emailField = (page: Page) => page.getByLabel('Email');
const submit = (page: Page) => page.getByRole('button', { name: /Try FX Replay Free|Creating your account/ });

test('signs up, completes the optional profile, with no axe violations in any state', async ({ page }) => {
  const bodies: Record<string, unknown>[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && new URL(req.url()).pathname === '/users') bodies.push(req.postDataJSON());
  });
  await page.goto('/#signup');
  await expectNoAxeViolations(page);
  await page.getByLabel(/First name/).fill('Ana');
  await emailField(page).fill(uniqueEmail('happy'));
  await submit(page).click();
  await expect(page.getByRole('heading', { name: 'Your free account is ready' })).toBeFocused();
  await expectNoAxeViolations(page);

  expect(bodies[0]).toMatchObject({ firstName: 'Ana' });
  await expect(page.getByLabel(/First name/)).toHaveCount(0);
  await page.getByRole('radio', { name: 'Beginner' }).check();
  await page.getByRole('checkbox', { name: 'Forex' }).check();
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved. Thanks.')).toBeFocused();
  await expectNoAxeViolations(page);
});

test('the profile step can be skipped', async ({ page }) => {
  await page.goto('/#signup');
  await emailField(page).fill(uniqueEmail('skip'));
  await submit(page).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await expect(page.getByText('No problem. Your account is created.')).toBeFocused();
});

test('client validation blocks an invalid email without calling the API', async ({ page }) => {
  const requests = trackSignupRequests(page);
  await page.goto('/#signup');
  await emailField(page).fill('not-an-email');
  await submit(page).click();
  await expect(page.locator('form [role="alert"]')).toContainText('Enter a valid email address');
  await expect(emailField(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(emailField(page)).toBeFocused();
  await expectNoAxeViolations(page);
  expect(requests).toHaveLength(0);
});

test('a taken email shows a specific message on the field', async ({ page }) => {
  const email = uniqueEmail('taken');
  const created = await page.request.post('/users', { data: { email } });
  expect(created.status()).toBe(201);
  await page.goto('/#signup');
  await emailField(page).fill(email);
  await submit(page).click();
  await expect(page.locator('form [role="alert"]')).toContainText('This email already has an account');
  await expect(emailField(page)).toBeFocused();
  await expectNoAxeViolations(page);
});

test('a server error offers a retry that succeeds', async ({ page }) => {
  await page.route('**/users', (route) =>
    route.fulfill({ status: 500, json: { error: { code: 'INTERNAL', message: 'x', requestId: 'r' } } }),
  );
  await page.goto('/#signup');
  await emailField(page).fill(uniqueEmail('retry'));
  await submit(page).click();
  await expect(page.getByText("We couldn't create your account")).toBeFocused();
  await expectNoAxeViolations(page);
  await page.unroute('**/users');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Your free account is ready' })).toBeFocused();
});

test('a timeout offers a retry that reuses the same Idempotency-Key', async ({ page }) => {
  await page.clock.install();
  const requests = trackSignupRequests(page);
  let hang = true;
  await page.route('**/users', async (route) => {
    if (hang) return; // never answers: the client gives up after its timeout
    await route.continue();
  });
  await page.goto('/#signup');
  await emailField(page).fill(uniqueEmail('timeout'));
  await submit(page).click();
  await expect(submit(page)).toHaveText('Creating your account…');
  await expect(page.getByRole('status')).toHaveText('Creating your account…');
  await page.clock.fastForward(10_500);
  await expect(page.getByText('This is taking longer than usual')).toBeFocused();
  await expectNoAxeViolations(page);
  hang = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Your free account is ready' })).toBeFocused();
  expect(requests).toHaveLength(2);
  expect(requests[0]?.key).toBeTruthy();
  expect(requests[1]?.key).toBe(requests[0]?.key);
});

test('changing the name after a timeout starts a new attempt with a new key', async ({ page }) => {
  await page.clock.install();
  const requests = trackSignupRequests(page);
  let hang = true;
  await page.route('**/users', async (route) => {
    if (hang) return;
    await route.continue();
  });
  await page.goto('/#signup');
  await emailField(page).fill(uniqueEmail('rename'));
  await submit(page).click();
  await page.clock.fastForward(10_500);
  await expect(page.getByText('This is taking longer than usual')).toBeFocused();
  hang = false;
  await page.getByLabel(/First name/).fill('Bea');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Your free account is ready' })).toBeFocused();
  expect(requests).toHaveLength(2);
  expect(requests[1]?.key).toBeTruthy();
  expect(requests[1]?.key).not.toBe(requests[0]?.key);
});

test('double-clicking submit sends one request', async ({ page }) => {
  const requests = trackSignupRequests(page);
  await page.route('**/users', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto('/#signup');
  await emailField(page).fill(uniqueEmail('double'));
  await submit(page).dblclick();
  await expect(page.getByRole('heading', { name: 'Your free account is ready' })).toBeVisible();
  expect(requests).toHaveLength(1);
});

test('the whole flow works with the keyboard only', async ({ page }) => {
  await page.goto('/');
  // Tab from the top: skip link, header CTA, "See how it works", first name, then the email field.
  for (let i = 0; i < 6 && !(await emailField(page).evaluate((el) => el === document.activeElement)); i += 1) {
    await page.keyboard.press('Tab');
  }
  await expect(emailField(page)).toBeFocused();
  await page.keyboard.type(uniqueEmail('keyboard'));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your free account is ready' })).toBeFocused();
  await page.getByRole('button', { name: 'Skip for now' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('No problem. Your account is created.')).toBeFocused();
});

test('reduced motion turns off smooth scrolling, which is on by default', async ({ page }) => {
  const scrollBehavior = () => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  await page.goto('/');
  expect(await scrollBehavior()).toBe('smooth');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await scrollBehavior()).toBe('auto');
});

test('a network failure offers a retry, keeping focus on the form', async ({ page }) => {
  await page.route('**/users', (route) => route.abort('failed'));
  await page.goto('/#signup');
  await emailField(page).fill(uniqueEmail('network'));
  await submit(page).click();
  await expect(page.getByText("We couldn't create your account")).toBeFocused();
  await expectNoAxeViolations(page);
  await page.unroute('**/users');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('body')).not.toBeFocused();
  await expect(page.getByRole('heading', { name: 'Your free account is ready' })).toBeFocused();
});

test('an empty email shows the required message', async ({ page }) => {
  await page.goto('/#signup');
  await submit(page).click();
  await expect(page.locator('form [role="alert"]')).toContainText('Enter your email address');
  await expect(emailField(page)).toBeFocused();
});

test('signup_started fires once, on the first focus of the name field', async ({ page }) => {
  const events: string[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).pathname === '/api/e') events.push((req.postDataJSON() as { name: string }).name);
  });
  await page.goto('/#signup');
  await page.getByLabel(/First name/).focus();
  await emailField(page).focus();
  await expect.poll(() => events.filter((e) => e === 'signup_started')).toHaveLength(1);
});
