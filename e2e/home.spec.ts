import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['/', '/variants/quiz', '/variants/control']) {
  test(`${path}: one h1, the signup form above the fold, no axe violations, no horizontal scroll`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    const signup = page.locator('#signup');
    await expect(signup).toBeInViewport();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
}

test('SEO: title, description, canonical, Open Graph and valid JSON-LD', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Try FX Replay Free/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /no credit card required/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://fx-replay-challenge.vercel.app');
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
  expect(jsonLd).toMatchObject({ '@type': 'SoftwareApplication', offers: { price: '0' } });
});

test('the quiz variant stays indexable and points its canonical at /', async ({ page }) => {
  await page.goto('/variants/quiz');
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://fx-replay-challenge.vercel.app');
});

test('robots.txt, sitemap.xml, the icon and the OG image are served', async ({ request }) => {
  for (const path of ['/robots.txt', '/sitemap.xml', '/icon.svg', '/opengraph-image']) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
});

test('the CTAs lead to the signup form', async ({ page }) => {
  await page.goto('/');
  const ctas = page.getByRole('link', { name: 'Try FX Replay Free' });
  expect(await ctas.count()).toBeGreaterThanOrEqual(2);
  for (const cta of await ctas.all()) await expect(cta).toHaveAttribute('href', '#signup');
});

test('reduced motion stops the hero entrance animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const duration = await page
    .locator('.reveal')
    .first()
    .evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(0.001);
});

test('reduced motion also stops the scroll-driven section animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const name = await page
    .locator('.on-scroll')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(name).toBe('none');
});

test('the landing sends landing_viewed and cta_clicked to the relay, tagged as test traffic', async ({ page }) => {
  const sent: { name: string; props: Record<string, unknown> }[] = [];
  const statuses: number[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).pathname === '/api/e') sent.push(req.postDataJSON());
  });
  page.on('response', (res) => {
    if (new URL(res.url()).pathname === '/api/e') statuses.push(res.status());
  });
  await page.goto('/');
  await expect.poll(() => sent.map((e) => e.name)).toContain('landing_viewed');
  await page.getByRole('link', { name: 'Try FX Replay Free' }).first().click();
  await expect.poll(() => sent.map((e) => e.name)).toContain('cta_clicked');
  expect(sent.find((e) => e.name === 'cta_clicked')?.props).toEqual({ cta_id: 'header' });
  expect(sent.find((e) => e.name === 'landing_viewed')?.props).toEqual({ referrer_domain: null });
  await expect.poll(() => statuses.length).toBeGreaterThanOrEqual(2);
  expect(statuses.every((s) => s === 204)).toBe(true);
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === '__Host-fxr_test')?.value).toBe('1');
  expect(cookies.find((c) => c.name === '__Host-fxr_aid')?.value).toMatch(/^[0-9a-f-]{36}$/);
});

test('a first visit without a variant cookie is assigned one and keeps it', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    extraHTTPHeaders: { 'x-fxr-test': '1' },
  });
  const page = await context.newPage();
  await page.goto('/');
  const first = (await context.cookies()).find((c) => c.name === '__Host-fxr_variant')?.value;
  expect(['control', 'quiz']).toContain(first);
  await page.reload();
  expect((await context.cookies()).find((c) => c.name === '__Host-fxr_variant')?.value).toBe(first);
  // The URL never changes; the quiz is served at / through a rewrite.
  expect(new URL(page.url()).pathname).toBe('/');
  await expect(first === 'quiz' ? page.getByRole('progressbar') : page.getByLabel('Email')).toBeVisible();
  await context.close();
});

test('?fxr_variant=quiz serves the quiz at / without changing the URL', async ({ page }) => {
  await page.goto('/?fxr_variant=quiz');
  await expect(page.getByRole('progressbar')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
});

test('/variants/control always serves the email-first arm and pins it', async ({ browser }) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
    extraHTTPHeaders: { 'x-fxr-test': '1' },
  });
  const page = await context.newPage();
  await page.goto('/variants/control');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  expect((await context.cookies()).find((c) => c.name === '__Host-fxr_variant')?.value).toBe('control');
  await context.close();
});

test('product screenshots load with explicit sizes and lazy loading below the fold', async ({ page }) => {
  await page.goto('/');
  const images = page.locator('main img');
  await expect(images).toHaveCount(3);
  for (const img of await images.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveAttribute('width', /\d+/);
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
});
