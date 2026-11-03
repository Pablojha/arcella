import { expect, test } from '@playwright/test';
import { MEMBER_PAGES, PUBLIC_PAGES, newMember, prepare, sideways } from './helpers.js';

const WIDTHS = [320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920];

// Widths are set explicitly, so this runs once (in the desktop project) rather than once per device.
test.describe('every page fits every common screen width', () => {
  test.skip(({ isMobile }) => isMobile, 'widths are set explicitly');
  test.describe.configure({ timeout: 10 * 60_000 });

  test('public pages', async ({ page }) => {
    await prepare(page, null);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of PUBLIC_PAGES) {
        await page.goto(path);
        expect(await page.evaluate(sideways), `${path} at ${width}px`).toEqual([]);
      }
    }
  });

  test('members’ pages', async ({ page }) => {
    await prepare(page, await newMember('Width Tester'));
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of MEMBER_PAGES) {
        await page.goto(path, { waitUntil: 'networkidle' });
        expect(await page.evaluate(sideways), `${path} at ${width}px`).toEqual([]);
      }
    }
  });
});
