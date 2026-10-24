import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['/', '/variants/quiz']) {
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
