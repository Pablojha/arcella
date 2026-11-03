import { expect, test } from '@playwright/test';
import { api, newMember, prepare } from './helpers.js';

test('hashtags and mentions link up, posts can be edited, members follow each other and choose their notifications', async ({ page, browser, baseURL, isMobile }) => {
  test.setTimeout(150_000);
  const run = Date.now().toString(36);
  const [ana, ben] = await Promise.all([newMember(`Ana Social ${run}`), newMember(`Ben Social ${run}`)]);
  const tag = `crit${run}`;

  // Ana posts with a hashtag and a mention.
  await prepare(page, ana);
  await page.goto('/');
  await (isMobile ? page.getByRole('button', { name: 'Create a post' }) : page.getByText('Share a sketch, a site visit, a jury moment…')).click();
  const composer = page.getByRole('dialog', { name: 'Create a post' });
  await composer.getByRole('textbox').fill(`Pin-up tonight #${tag} with @${ben.user.username}`);
  await composer.getByRole('button', { name: 'Post', exact: true }).click();
  const post = page.locator('main article').filter({ hasText: `#${tag}` }).first();
  await expect(post.getByRole('link', { name: `@${ben.user.username}` })).toHaveAttribute('href', `/u/${ben.user.username}`);

  // She edits it; the change shows at once and is marked edited.
  await post.getByRole('button', { name: 'Post options' }).click();
  await page.getByRole('menuitem', { name: 'Edit post' }).click();
  const editor = page.getByRole('dialog', { name: 'Edit post' });
  await editor.getByLabel('Post text').fill(`Pin-up moved to Friday #${tag} with @${ben.user.username}`);
  await editor.getByRole('button', { name: 'Save' }).click();
  await expect(post).toContainText('Pin-up moved to Friday');
  await expect(post).toContainText('edited');

  // Ben is told about the mention, opens the hashtag feed, then follows Ana from her profile.
  const context = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const other = await context.newPage();
  await prepare(other, ben);
  await other.goto('/notifications');
  await expect(other.getByText('mentioned you').first()).toBeVisible();
  await other.goto(`/u/${ana.user.username}`);
  await other.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(other.getByRole('button', { name: 'Following' })).toBeVisible();
  await expect(other.getByText('1 follower')).toBeVisible();
  await other.goto('/');
  await other.getByRole('link', { name: `#${tag}` }).first().click();
  await expect(other.getByRole('heading', { level: 1 })).toHaveText(`#${tag}`);
  await expect(other.locator('main article')).toContainText('Pin-up moved to Friday');
  await context.close();

  await page.goto('/notifications');
  await expect(page.getByText('started following you')).toBeVisible();

  // Ana switches off likes; the choice is kept, and likes no longer notify her.
  await page.goto('/settings');
  const likes = page.getByRole('switch', { name: 'Likes and appreciations' });
  await likes.click();
  await expect(likes).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Likes and appreciations' })).toHaveAttribute('aria-checked', 'false');
  const { items } = await api('GET', `/posts?tag=${tag}`, { token: ben.token });
  await api('POST', `/posts/${items[0]._id}/like`, { token: ben.token });
  expect((await api('GET', '/notifications', { token: ana.token })).items.some((note) => note.type === 'like')).toBe(false);
});
