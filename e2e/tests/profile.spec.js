import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { api, newMember, prepare } from './helpers.js';

const RESUME = { name: 'ira-resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') };

test('a member adds languages, a certification and a public phone, sees who viewed them, and applies with a saved resume', async ({ page, browser, baseURL }) => {
  test.setTimeout(150_000);
  const run = Date.now().toString(36);
  const [ira, jay, recruiter] = await Promise.all([newMember(`Ira Profile ${run}`), newMember(`Jay Viewer ${run}`), newMember(`Rita Hiring ${run}`)]);

  await prepare(page, ira);
  await page.goto(`/u/${ira.user.username}?edit=1`);
  const editor = page.getByRole('dialog', { name: 'Edit profile' });
  await editor.locator('input[placeholder="English, Hindi…"]').fill('Marathi');
  await editor.locator('input[placeholder="English, Hindi…"]').press('Enter');
  await editor.getByRole('button', { name: 'Add certification' }).click();
  await editor.getByLabel('Certification', { exact: true }).fill('LEED Green Associate');
  await editor.getByLabel('Issued by').fill('USGBC');
  await editor.getByLabel('Phone', { exact: true }).fill('+91 98765 43210');
  await editor.getByLabel('Who sees your phone').selectOption('everyone');
  await editor.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile updated')).toBeVisible();

  // Another member sees what was shared, and counts as a profile view.
  const context = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const other = await context.newPage();
  await prepare(other, jay);
  await other.goto(`/u/${ira.user.username}`);
  await expect(other.getByText('Marathi')).toBeVisible();
  await expect(other.getByText('LEED Green Associate')).toBeVisible();
  await expect(other.getByRole('link', { name: '+91 98765 43210' })).toBeVisible();
  await expect(other.getByText(ira.email)).toHaveCount(0);
  await context.close();

  await page.goto(`/u/${ira.user.username}`);
  await expect(page.getByText('1 profile view')).toBeVisible();
  await page.getByText('1 profile view').click();
  const viewers = page.getByRole('dialog', { name: 'Who viewed your profile' });
  await expect(viewers.getByText(`Jay Viewer ${run}`)).toBeVisible();
  await page.keyboard.press('Escape');
  // Colours are measured once the sheet has finished fading out (slower machines, like CI, take longer).
  await expect(viewers).toBeHidden();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);

  // Save a resume once, then apply with it.
  await page.getByLabel('Resume file').setInputFiles(RESUME);
  await expect(page.getByText('Resume saved')).toBeVisible();
  const job = await api('POST', '/jobs', { token: recruiter.token, body: { title: `Renderer ${run}`, type: 'freelance', company: 'Rita Studio' } });
  await page.goto(`/jobs/${job._id}`);
  await page.getByRole('button', { name: 'Apply' }).click();
  const sheet = page.getByRole('dialog', { name: 'Apply to Rita Studio' });
  await expect(sheet.getByText('ira-resume.pdf')).toBeVisible();
  await sheet.getByRole('button', { name: 'Send application' }).click();
  await expect(page.getByText('Your application')).toBeVisible();
  const { items } = await api('GET', `/jobs/${job._id}/applications`, { token: recruiter.token });
  expect(items[0].resume.name).toBe('ira-resume.pdf');
});
