import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { API, api, newMember, prepare } from './helpers.js';

test('a firm owner makes a team member admin, who posts as the firm; followers see it in their feed', async ({ page, browser, baseURL, isMobile }) => {
  test.setTimeout(150_000);
  const run = Date.now().toString(36);
  const [owner, admin, fan] = await Promise.all([newMember(`Owen Owner ${run}`), newMember(`Ada Admin ${run}`), newMember(`Fay Follower ${run}`)]);
  const form = new FormData();
  form.append('name', `Courtyard Studio ${run}`);
  form.append('logo', new File([fs.readFileSync('../frontend/assets/play-store-icon-512.png')], 'logo.png', { type: 'image/png' }));
  const firm = await (await fetch(`${API}/firms`, { method: 'POST', headers: { Authorization: `Bearer ${owner.token}` }, body: form })).json();
  await api('POST', `/firms/${firm._id}/work`, { token: admin.token });
  await api('POST', `/firms/${firm._id}/follow`, { token: fan.token });

  // The owner makes Ada an admin from the team list.
  await prepare(page, owner);
  await page.goto(`/firms/${firm.slug}?tab=team`);
  await page.getByRole('button', { name: 'Make admin' }).click();
  await expect(page.getByText(`Ada Admin ${run} is now an admin`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove admin' })).toBeVisible();

  // Ada sees the insights and posts as the firm.
  const context = await browser.newContext({ baseURL, viewport: page.viewportSize(), isMobile });
  const adminPage = await context.newPage();
  await prepare(adminPage, admin);
  await adminPage.goto(`/firms/${firm.slug}`);
  await expect(adminPage.getByText(/Insights/)).toBeVisible();
  await adminPage.getByRole('tab', { name: 'Posts' }).click();
  await adminPage.getByRole('button', { name: `Post as Courtyard Studio ${run}` }).click();
  const composer = adminPage.getByRole('dialog', { name: 'Create a post' });
  await composer.getByRole('textbox').fill(`Open studio day this Saturday ${run}`);
  await composer.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(adminPage.locator('main article').filter({ hasText: `Open studio day this Saturday ${run}` })).toContainText(`Posted by Ada Admin ${run}`);
  await context.close();

  // A follower of the firm finds it in My network, under the firm's name.
  await prepare(page, fan);
  await page.goto('/');
  await page.getByRole('tab', { name: 'My network' }).click();
  const post = page.locator('main article').filter({ hasText: `Open studio day this Saturday ${run}` });
  await expect(post.getByRole('link', { name: new RegExp(`Courtyard Studio ${run}`) })).toBeVisible();
  await expect(page.getByText(/Insights/)).toHaveCount(0);
});
