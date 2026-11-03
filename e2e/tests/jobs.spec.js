import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { api, newMember, prepare } from './helpers.js';

const RESUME = { name: 'asha-resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') };
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const violations = async (page) => (await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.target.join(' ')}`);

test('a recruiter posts a role, a member applies with a resume, and the application moves through interview', async ({ page, browser, baseURL }) => {
  test.setTimeout(180_000);
  const [recruiter, seeker] = await Promise.all([newMember('Rhea Recruiter'), newMember('Asha Seeker')]);
  const title = `Studio intern ${Date.now()}`;

  // The recruiter posts a role that takes applications in Arcella.
  await prepare(page, recruiter);
  await page.goto('/jobs/new');
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Company or organiser').fill('Rhea Studio');
  await page.getByRole('button', { name: 'Hybrid' }).click();
  await page.getByLabel('Experience').selectOption('fresher');
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await expect(page.getByRole('link', { name: 'Applicants (0)' })).toBeVisible();
  const jobUrl = page.url();

  // The seeker finds it with the filters, saves it and applies.
  // A separate browser context, as a second person on their own device (axe needs pages opened this way).
  const context = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const tab = await context.newPage();
  await prepare(tab, seeker);
  await tab.goto('/jobs');
  await tab.getByRole('button', { name: 'Hybrid' }).click();
  await tab.getByPlaceholder('Role, firm or skill').fill(title);
  await tab.getByRole('link', { name: new RegExp(title) }).click();
  await tab.getByRole('button', { name: 'Save' }).click();
  await expect(tab.getByRole('button', { name: 'Saved' })).toBeVisible();
  await tab.getByRole('button', { name: 'Apply' }).click();
  const sheet = tab.getByRole('dialog', { name: 'Apply to Rhea Studio' });
  await sheet.getByLabel('Resume').setInputFiles(RESUME);
  await sheet.getByLabel('Note to the hiring team').fill('I draw sections by hand.');
  await sheet.getByRole('button', { name: 'Send application' }).click();
  await expect(tab.getByText('Application sent')).toBeVisible();
  await expect(sheet).toBeHidden();
  await expect(tab.getByText('Your application')).toBeVisible();
  expect(await violations(tab)).toEqual([]);

  // The recruiter sees the applicant, downloads the resume and schedules an interview.
  await page.goto(`${jobUrl}/applicants`);
  await expect(page.getByText('Asha Seeker')).toBeVisible();
  await expect(page.getByText('I draw sections by hand.')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Resume' }).click();
  expect((await download).suggestedFilename()).toBe('asha-resume.pdf');
  await page.getByLabel('Stage').selectOption('interview');
  const schedule = page.getByRole('dialog', { name: 'Schedule an interview' });
  await schedule.getByLabel('Date and time').fill('2030-01-15T10:30');
  await schedule.getByLabel('Details for the applicant').fill('Studio, 2nd floor');
  await schedule.getByRole('button', { name: 'Schedule and notify' }).click();
  await expect(page.getByText('Moved to Interview')).toBeVisible();
  await expect(schedule).toBeHidden();
  expect(await violations(page)).toEqual([]);

  // The seeker is notified and sees the stage in Applied and on the role.
  await tab.goto('/notifications');
  await expect(tab.getByText(/Interview scheduled/)).toBeVisible();
  await tab.goto('/jobs?tab=applied');
  await expect(tab.getByRole('link', { name: new RegExp(title) })).toContainText('Interview');
  await tab.goto('/jobs?tab=saved');
  await expect(tab.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  await context.close();
});

test("applicants and resumes stay private to the people hiring", async () => {
  const [recruiter, seeker, stranger] = await Promise.all([newMember('Private Recruiter'), newMember('Private Seeker'), newMember('Curious Stranger')]);
  const job = await api('POST', '/jobs', { token: recruiter.token, body: { title: 'Private role', type: 'internship', company: 'Quiet Studio' } });
  for (const member of [seeker, stranger]) {
    await expect(api('GET', `/jobs/${job._id}/applications`, { token: member.token })).rejects.toMatchObject({ status: 403 });
  }
  await expect(api('PATCH', `/jobs/${job._id}`, { token: stranger.token, body: { closed: true } })).rejects.toMatchObject({ status: 403 });
});
