import { expect, test } from '@playwright/test';
import { prepare } from './helpers.js';

test('sign up with consent and a code, log out, log back in, and reset a forgotten password', async ({ page }) => {
  const email = `journey.${Date.now().toString(36)}@e2e.arcella`;
  const password = page.locator('input[type="password"]');
  await prepare(page, null);

  // Sign-up needs the Terms box ticked; the browser refuses the form until it is.
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Journey Tester');
  await page.getByLabel('Email').fill(email);
  await password.fill('password123');
  const consent = page.getByRole('checkbox', { name: /I agree to the Terms of Use/ });
  await page.getByRole('button', { name: 'Create account' }).click();
  expect(await consent.evaluate((box) => box.validity.valueMissing)).toBe(true);
  await consent.check();
  const registered = page.waitForResponse((res) => res.url().endsWith('/auth/register'));
  await page.getByRole('button', { name: 'Create account' }).click();
  const { devCode } = await (await registered).json();
  await page.getByLabel('Verification code').fill(devCode);
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByText('Welcome to Arcella, Journey!')).toBeVisible();

  // The profile is one tap away, then log out from More.
  await page.goto('/more');
  await page.getByRole('link', { name: /Journey Tester/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Journey Tester' })).toBeVisible();
  await page.goto('/more');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible();

  // A wrong password is refused with a clear message.
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await password.fill('not-the-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Wrong email or password')).toBeVisible();

  // Forgot password: a code by email, a new password, and you are in. (Wait for the reset page itself: while its
  // code loads, the login form is still on screen.)
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  const requested = page.waitForResponse((res) => res.url().endsWith('/auth/forgot'));
  await page.getByRole('button', { name: 'Send code' }).click();
  const reset = await (await requested).json();
  await page.getByLabel('Verification code').fill(reset.devCode);
  await password.fill('a-new-password-456');
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Home' }).first()).toBeVisible();

  // The new password works and the old one doesn't.
  await page.goto('/more');
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await password.fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Wrong email or password')).toBeVisible();
  await password.fill('a-new-password-456');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Welcome back, Journey!')).toBeVisible();
});
