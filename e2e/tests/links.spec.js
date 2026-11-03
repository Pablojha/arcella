import { expect, test } from '@playwright/test';
import { MEMBER_PAGES, PUBLIC_PAGES, newMember, prepare } from './helpers.js';

/** Every in-app link on these pages, without duplicates. */
async function linksOn(page, paths) {
  const found = new Set();
  for (const path of paths) {
    await page.goto(path, { waitUntil: 'networkidle' });
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    hrefs.filter((href) => !href.startsWith('/uploads/')).forEach((href) => found.add(href.split('#')[0]));
  }
  return [...found];
}

async function brokenAmong(page, hrefs) {
  const broken = [];
  for (const href of hrefs) {
    await page.goto(href);
    if (await page.getByRole('heading', { name: "This sheet isn't in the set" }).count()) broken.push(href);
  }
  return broken;
}

test.describe('no broken internal links', () => {
  test.skip(({ isMobile }) => isMobile, 'links are the same on every device');
  test.describe.configure({ timeout: 5 * 60_000 });

  test('from public pages', async ({ page }) => {
    await prepare(page, null);
    expect(await brokenAmong(page, await linksOn(page, PUBLIC_PAGES))).toEqual([]);
  });

  test('from members’ pages', async ({ page }) => {
    await prepare(page, await newMember('Link Checker'));
    expect(await brokenAmong(page, await linksOn(page, MEMBER_PAGES))).toEqual([]);
  });
});
