import { expect, test } from '@playwright/test';
import { api, newMember, prepare } from './helpers.js';

const openComposer = (page, isMobile) => (isMobile ? page.getByRole('button', { name: 'Create a post' }) : page.getByText('Share a sketch, a site visit, a jury moment…')).click();

test('without an API key the AI assistant stays switched off: no buttons, and the API refuses', async ({ page, isMobile }) => {
  const member = await newMember('No AI Member');
  expect(await api('GET', '/ai/status', { token: member.token })).toEqual({ enabled: false });
  await expect(api('POST', '/ai/improve', { token: member.token, body: { kind: 'headline' } })).rejects.toMatchObject({ status: 503 });
  await prepare(page, member);
  await page.goto('/');
  await openComposer(page, isMobile);
  await page.getByRole('dialog', { name: 'Create a post' }).getByRole('textbox').fill('A long enough draft about my studio');
  await expect(page.getByRole('button', { name: 'Improve with AI' })).toHaveCount(0);
});

test('with the assistant on, members improve a post and see how they match a job', async ({ page, isMobile }) => {
  const [member, recruiter] = await Promise.all([newMember('AI Member'), newMember('AI Recruiter')]);
  const job = await api('POST', '/jobs', { token: recruiter.token, body: { title: 'Model maker', type: 'internship', company: 'Scale Studio' } });
  // The server side is tested against a stand-in for the Claude API; here the browser's AI calls are answered directly.
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { enabled: true } }));
  await page.route('**/api/ai/improve', (route) => route.fulfill({ json: { text: 'Site visit to the stepwell today: notes on light and shade. #heritage' } }));
  await page.route(`**/api/ai/job-match/${job._id}`, (route) => route.fulfill({ json: { fit: 64, matched: ['Model making'], missing: ['Laser cutting'], advice: 'Show your physical models first.' } }));
  await prepare(page, member);

  await page.goto('/');
  await openComposer(page, isMobile);
  const composer = page.getByRole('dialog', { name: 'Create a post' });
  await composer.getByRole('textbox').fill('went to stepwell today, light was nice');
  await composer.getByRole('button', { name: 'Improve with AI' }).click();
  await expect(composer.getByRole('textbox')).toHaveValue('Site visit to the stepwell today: notes on light and shade. #heritage');

  await page.goto(`/jobs/${job._id}`);
  await page.getByRole('button', { name: 'How well do I match?' }).click();
  const sheet = page.getByRole('dialog', { name: 'How you match this role' });
  await expect(sheet).toContainText('64');
  await expect(sheet).toContainText('Laser cutting');
  await expect(sheet).toContainText('Show your physical models first.');
});
