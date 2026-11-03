import { defineConfig, devices } from '@playwright/test';

// Runs against a production build served by `vite preview` (so the real security headers apply) and an API started
// outside production, which returns one-time codes in its responses instead of emailing them. See README → Testing.
const channel = process.env.E2E_CHANNEL || undefined; // e.g. "msedge" or "chrome" to use an installed browser

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  globalTimeout: 45 * 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4173',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel } },
  ],
});
