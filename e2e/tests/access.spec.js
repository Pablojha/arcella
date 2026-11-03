import { expect, test } from '@playwright/test';
import { adminMember, api, newMember, prepare } from './helpers.js';

test('members-only pages send visitors to log in, then back where they were going', async ({ page }) => {
  const member = await newMember('Access Tester');
  await prepare(page, null);
  await page.goto('/messages');
  await expect(page).toHaveURL(/\/login\?next=%2Fmessages$/);
  await page.getByLabel('Email').fill(member.email);
  await page.locator('input[type="password"]').fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/messages$/);
});

test('the admin area is only for site admins, in the app and in the API', async ({ page, browser }) => {
  const member = await newMember('Regular Member');
  await prepare(page, member);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("This sheet isn't in the set");
  await expect(api('GET', '/admin/stats', { token: member.token })).rejects.toMatchObject({ status: 403 });

  const admin = await adminMember();
  expect(admin.user.isAdmin, 'E2E_ADMIN_EMAIL must be in the API’s ADMIN_EMAIL list').toBe(true);
  const adminPage = await browser.newPage();
  await prepare(adminPage, admin);
  await adminPage.goto('/admin');
  await expect(adminPage.getByRole('heading', { level: 1 })).toHaveText(/Admin/);
  await adminPage.close();
});

test('the API refuses requests without a valid session', async () => {
  await expect(api('GET', '/auth/me')).rejects.toMatchObject({ status: 401 });
  await expect(api('GET', '/messages', { token: 'not-a-real-token' })).rejects.toMatchObject({ status: 401 });
});
