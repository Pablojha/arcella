import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PASSWORD, adminMember, api, newMember, prepare } from './helpers.js';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test('a super admin makes a moderator, who suspends a member; the member is told why and the audit log records it', async ({ page, browser, baseURL }) => {
  test.setTimeout(180_000);
  // Unique names: the test database keeps members from earlier runs.
  const run = Date.now().toString(36);
  const [modName, memberName] = [`Mira Moderator ${run}`, `Spammy Member ${run}`];
  const [admin, moderator, member] = await Promise.all([adminMember(), newMember(modName), newMember(memberName)]);
  expect(admin.user.role, 'E2E_ADMIN_EMAIL must be in the API’s ADMIN_EMAIL list').toBe('super_admin');

  // The overview: live counts and the weekly sign-ups chart, accessible.
  await prepare(page, admin);
  await page.goto('/admin');
  await expect(page.getByRole('figure', { name: 'New members per week' })).toBeVisible();
  await expect(page.getByText('Joined this week')).toBeVisible();
  await page.waitForTimeout(800);
  expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations.map((violation) => violation.id)).toEqual([]);

  // Promote from the Users tab.
  await page.getByRole('tab', { name: 'Users' }).click();
  await page.getByPlaceholder('Search by name, email or username').fill(modName);
  await page.getByLabel(`Role of ${modName}`).selectOption('moderator');
  await expect(page.getByText(`${modName} is now: Moderator`)).toBeVisible();

  // The moderator sees only the tabs their role allows, and suspends the member.
  const context = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const mod = await context.newPage();
  await prepare(mod, moderator);
  await mod.goto('/admin?tab=users');
  await expect(mod.getByRole('tab', { name: 'Reports' })).toBeVisible();
  await expect(mod.getByRole('tab', { name: 'Audit log' })).toHaveCount(0);
  await expect(mod.getByRole('tab', { name: 'Colleges' })).toHaveCount(0);
  await mod.getByPlaceholder('Search by name, email or username').fill(memberName);
  const answers = ['3', 'Posting spam links'];
  mod.on('dialog', (dialog) => dialog.accept(answers.shift()));
  const row = mod.locator('.card', { hasText: memberName });
  await row.getByRole('button', { name: 'Suspend' }).click();
  await expect(mod.getByText('Account suspended and signed out')).toBeVisible();
  await expect(row.getByText(/Suspended until/)).toBeVisible();
  // Banning is for admins only.
  await expect(row.getByRole('button', { name: 'Ban' })).toHaveCount(0);
  await context.close();

  // The member can't sign in, and sees the reason.
  await expect(api('GET', '/auth/me', { token: member.token })).rejects.toMatchObject({ status: 401 });
  const signIn = await browser.newContext({ baseURL });
  const login = await signIn.newPage();
  await prepare(login, null);
  await login.goto('/login');
  await login.getByLabel('Email').fill(member.email);
  await login.locator('input[type="password"]').fill(PASSWORD);
  await login.getByRole('button', { name: 'Log in' }).click();
  await expect(login.getByText(/suspended until .*Posting spam links/)).toBeVisible();
  await signIn.close();

  // The audit log shows both actions.
  await page.getByRole('tab', { name: 'Audit log' }).click();
  await expect(page.getByText('suspended', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('changed the role of').first()).toBeVisible();

  await api('POST', `/admin/users/${member.user._id}/status`, { token: admin.token, body: { status: 'active' } });
  await api('PATCH', `/admin/users/${moderator.user._id}/role`, { token: admin.token, body: { role: 'user' } });
});
