import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { MEMBER_PAGES, PUBLIC_PAGES, newMember, prepare } from './helpers.js';

// WCAG 2.2 AA, as automated by axe-core. It can't judge everything (meaning, flow, captions), but nothing it finds
// may ship.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violationsOn(page, path) {
  await page.goto(path, { waitUntil: 'networkidle' });
  // Entrance fades must finish first, so colours are measured as members see them (slow machines take longer).
  // Endless animations, like loading shimmers, are ignored.
  await page.waitForFunction(
    () => document.getAnimations().every((animation) => animation.playState !== 'running' || animation.effect?.getComputedTiming().endTime === Infinity),
    null,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(300);
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return violations.map((violation) => `${path}: ${violation.id} (${violation.nodes.length}) ${violation.nodes[0]?.target.join(' ')}`);
}

for (const scheme of ['light', 'dark']) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme, reducedMotion: 'reduce' });
    test.describe.configure({ timeout: 5 * 60_000 });

    test('public pages pass automated WCAG 2.2 AA checks', async ({ page }) => {
      await prepare(page, null);
      const found = [];
      for (const path of PUBLIC_PAGES) found.push(...(await violationsOn(page, path)));
      expect(found).toEqual([]);
    });

    test('members’ pages pass automated WCAG 2.2 AA checks', async ({ page }) => {
      await prepare(page, await newMember('Access Checker'));
      const found = [];
      for (const path of MEMBER_PAGES) found.push(...(await violationsOn(page, path)));
      expect(found).toEqual([]);
    });
  });
}
