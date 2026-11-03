import { expect, test } from '@playwright/test';
import { PUBLIC_PAGES, prepare } from './helpers.js';

test.describe('public pages', () => {
  test.beforeEach(({ page }) => prepare(page, null));

  test('each has one h1 and its own title, description and canonical URL', async ({ page }) => {
    const titles = new Set();
    const descriptions = new Set();
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      await expect(page.locator('h1'), path).toHaveCount(1);
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(titles.has(title), `${path} repeats the title "${title}"`).toBe(false);
      expect(descriptions.has(description), `${path} repeats its description`).toBe(false);
      expect(new URL(canonical).pathname, `${path} canonical`).toBe(path);
      titles.add(title);
      descriptions.add(description);
    }
  });

  test('an unknown address shows the 404 page, kept out of search, with a way home', async ({ page }) => {
    await page.goto('/no-such-page');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("This sheet isn't in the set");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await page.getByRole('link', { name: 'Back to home' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('the footer reaches every policy page', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('navigation', { name: 'Policies' });
    for (const [label, heading] of [
      ['Terms', 'Terms of Use'],
      ['Privacy', 'Privacy Policy'],
      ['Guidelines', 'Community Guidelines'],
      ['Cookies', 'Cookie Policy'],
      ['Copyright', 'Copyright Policy'],
      ['Accessibility', 'Accessibility Statement'],
      ['Refunds', 'Refund Policy'],
    ]) {
      await footer.getByRole('link', { name: label, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      await page.goBack();
    }
  });
});

test('robots.txt, the sitemap and the security headers are served', async ({ request }) => {
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
  expect(await (await request.get('/sitemap.xml')).text()).toContain('<urlset');
  const headers = (await request.get('/')).headers();
  expect(headers['content-security-policy']).toContain("script-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('microphone=(self)');
});

test('the cookie notice asks once, remembers the answer, and can be changed later', async ({ page }) => {
  await prepare(page, null, { decided: false });
  await page.goto('/');
  const notice = page.getByRole('region', { name: 'Your privacy' });
  await expect(notice).toBeVisible();
  await notice.getByRole('button', { name: 'Essential only' }).click();
  await expect(notice).toBeHidden();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Your privacy' })).toHaveCount(0);
  const choice = () => page.evaluate(() => JSON.parse(localStorage.getItem('arcella_storage_choice')).preferences);
  expect(await choice()).toBe(false);
  await page.getByRole('navigation', { name: 'Policies' }).getByRole('button', { name: 'Cookie settings' }).click();
  await page.getByRole('dialog', { name: 'Cookie settings' }).getByRole('switch', { name: /Preferences/ }).click();
  expect(await choice()).toBe(true);
});
