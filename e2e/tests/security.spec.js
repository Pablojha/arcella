import { expect, test } from '@playwright/test';
import { _codeAt } from '../../backend/src/services/totp.js';
import { PASSWORD, api, newMember, prepare } from './helpers.js';

test('a member turns on two-factor sign-in, signs in with a recovery code and signs out another device', async ({ page }) => {
  test.setTimeout(120_000);
  const member = await newMember('Secure Member');
  // A second session, as if on a phone, to sign out from Settings.
  await api('POST', '/auth/login', { body: { email: member.email, password: PASSWORD } });
  await prepare(page, member);
  await page.goto('/settings?section=security');

  // Two devices are listed; the other one is signed out from here.
  const security = page.locator('#security');
  await expect(security.getByText('This device')).toBeVisible();
  await security.getByRole('button', { name: /^Sign out (?!all other devices)/ }).click();
  await expect(page.getByText('Signed out that device')).toBeVisible();

  // Two-factor setup with the key shown, confirmed with a code from "the app".
  await security.getByRole('button', { name: 'Set up two-factor sign-in' }).click();
  const secret = (await security.getByLabel('Setup key').textContent()).replace(/\s/g, '');
  await security.getByLabel('Verification code').fill(_codeAt(secret, Math.floor(Date.now() / 30_000)));
  await security.getByRole('button', { name: 'Turn on' }).click();
  await expect(page.getByText('Two-factor sign-in is on')).toBeVisible();
  const codes = await security.getByRole('list', { name: 'Recovery codes' }).getByRole('listitem').allTextContents();
  expect(codes).toHaveLength(8);
  await security.getByRole('button', { name: "I've saved them" }).click();
  await expect(security.getByText(/On: signing in asks for a code/)).toBeVisible();

  // Signing in again asks for the second step; a recovery code works once.
  await page.goto('/more');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible();
  await page.goto('/login');
  await page.getByLabel('Email').fill(member.email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Two-factor sign-in' })).toBeVisible();
  await page.getByRole('button', { name: 'Use a recovery code' }).click();
  await page.getByLabel('Recovery code').fill(codes[0]);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(/Welcome back, Secure!/)).toBeVisible();

  // The history shows the sign-ins. (Navigating inside the app: a page load would re-run prepare(), which puts back
  // the token that logging out revoked.)
  await page.getByRole('link', { name: 'More' }).first().click();
  await page.getByRole('link', { name: /Settings/ }).click();
  await expect(security.getByText(/^Signed in · /).first()).toBeVisible();
  await expect(security.getByText(/On: signing in asks for a code/)).toBeVisible();
});

test('logging out ends the session on the server, not just in the browser', async ({ page }) => {
  const member = await newMember('Logout Member');
  await prepare(page, member);
  await page.goto('/more');
  const loggedOut = page.waitForResponse((response) => response.url().endsWith('/auth/logout'));
  await page.getByRole('button', { name: 'Log out' }).click();
  expect((await loggedOut).ok()).toBe(true);
  await expect(api('GET', '/auth/me', { token: member.token })).rejects.toMatchObject({ status: 401 });
});
