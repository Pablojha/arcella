import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { adminMember, api, newMember, prepare } from './helpers.js';

test('a member reports a problem from the page they were on; support answers and the member follows up', async ({ page, browser, baseURL }) => {
  test.setTimeout(150_000);
  const run = Date.now().toString(36);
  const [member, admin] = await Promise.all([newMember(`Help Seeker ${run}`), adminMember()]);

  // The Help center answers common questions.
  await prepare(page, member);
  await page.goto('/help');
  await page.getByRole('button', { name: 'Who can message me?' }).click();
  await expect(page.getByText(/send you one message request/)).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);

  // "Report a problem" from More carries the page along.
  await page.goto('/more');
  await page.getByRole('link', { name: 'Report a problem' }).click();
  await expect(page.getByLabel('Topic')).toHaveValue('problem');
  await expect(page.getByText(/the page you were on \(\/more\)/)).toBeVisible();
  await page.getByLabel('Subject').fill(`Blank photo ${run}`);
  await page.getByLabel('Message').fill('A photo in my feed shows nothing at all.');
  await page.getByRole('button', { name: 'Send to the Arcella team' }).click();
  await expect(page.getByText(`Blank photo ${run}`)).toBeVisible();

  // Support (here the site admin) answers from the admin queue.
  const context = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const staff = await context.newPage();
  await prepare(staff, admin);
  await staff.goto('/admin?tab=support');
  const ticket = staff.locator('article').filter({ hasText: `Blank photo ${run}` });
  await expect(ticket).toContainText('On /more');
  await ticket.getByLabel(`Reply to Blank photo ${run}`).fill('Thanks! Please upload that photo again.');
  await ticket.getByRole('button', { name: 'Send reply' }).click();
  await expect(staff.getByText('Reply sent')).toBeVisible();
  await context.close();

  // The member is notified, reads the reply and follows up.
  await page.goto('/notifications');
  await expect(page.getByText('The Arcella team replied to your request')).toBeVisible();
  await page.goto('/help?tab=requests');
  const request = page.locator('article').filter({ hasText: `Blank photo ${run}` });
  await expect(request).toContainText('Thanks! Please upload that photo again.');
  await request.getByLabel(`Reply about Blank photo ${run}`).fill('Done, it shows now.');
  await request.getByRole('button', { name: 'Send' }).click();
  await expect(request).toContainText('Done, it shows now.');
  const { items } = await api('GET', '/support/mine', { token: member.token });
  expect(items[0].status).toBe('open');
});
