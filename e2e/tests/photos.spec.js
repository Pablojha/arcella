import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { API, newMember, prepare } from './helpers.js';

/** A 64×64 green 24-bit BMP: a format browsers open but the API doesn't store, so the app must convert it. */
function bmp(size = 64) {
  const row = Math.ceil((size * 3) / 4) * 4;
  const buffer = Buffer.alloc(54 + row * size);
  buffer.write('BM');
  buffer.writeUInt32LE(buffer.length, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(size, 18);
  buffer.writeInt32LE(size, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) buffer.set([0x47, 0x6b, 0x1d], 54 + y * row + x * 3);
  return buffer;
}

test('a photo in another format is converted, posted, and opens full screen', async ({ page, isMobile }) => {
  const member = await newMember('Photo Poster');
  await prepare(page, member);
  await page.goto('/');
  await (isMobile ? page.getByRole('button', { name: 'Create a post' }) : page.getByText('Share a sketch, a site visit, a jury moment…')).click();
  const dialog = page.getByRole('dialog', { name: 'Create a post' });
  // On wider screens every shortcut chip fits (phones swipe the row sideways).
  if (!isMobile) await expect(dialog.getByRole('button', { name: 'Job' })).toBeInViewport();
  await dialog.locator('input[type=file][accept="image/*"]').setInputFiles({ name: 'site-visit.bmp', mimeType: 'image/bmp', buffer: bmp() });
  await expect(dialog.locator('img').first()).toHaveJSProperty('naturalWidth', 64);
  const posted = page.waitForResponse((response) => response.url().endsWith('/api/posts') && response.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Post', exact: true }).click();
  const post = await (await posted).json();
  expect(post.images[0]).toMatch(/\.jpg$/);

  await page.locator(`main img[src*="${post.images[0].split('/').pop()}"]`).click();
  const full = page.locator('.fixed.inset-0 img');
  await expect(full).toBeVisible();
  await expect(full).toHaveJSProperty('naturalWidth', 64);
  expect((await full.boundingBox()).width).toBeGreaterThan(60);
});

/** Uploads `field` as multipart, as the app does. */
async function upload(member, path, fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  const res = await fetch(API + path, { method: 'POST', headers: { Authorization: `Bearer ${member.token}` }, body: form });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

test('photos whose files are gone show initials or a placeholder, never a broken image', async ({ page }) => {
  const member = await newMember('Lost Media');
  const png = new Blob([fs.readFileSync('../frontend/assets/play-store-icon-512.png')], { type: 'image/png' });
  member.user = (await upload(member, '/users/me/avatar', { image: new File([png], 'me.png') })).user;
  await upload(member, '/posts', { text: 'Before the disk was wiped', images: new File([png], 'site.png') });
  // As on a host that lost its disk: every uploaded file is gone.
  await page.route('**/uploads/**', (route) => route.fulfill({ status: 404, body: 'Not found' }));
  await prepare(page, member);
  await page.goto(`/u/${member.user.username}`);
  await expect(page.getByText('LM').first()).toBeVisible();
  await page.goto('/');
  const photo = page.locator('main article img[data-missing]').first();
  await expect(photo).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await photo.scrollIntoViewIfNeeded();
  await expect.poll(() => photo.evaluate((img) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
});
