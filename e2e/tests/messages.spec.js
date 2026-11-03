import { expect, test } from '@playwright/test';
import { newMember, prepare } from './helpers.js';

test('a stranger sends a message request, which is answered, searched and unsent', async ({ page, browser, baseURL }) => {
  test.setTimeout(150_000);
  const run = Date.now().toString(36);
  const [sara, tom] = await Promise.all([newMember(`Sara Request ${run}`), newMember(`Tom Request ${run}`)]);

  // Sara isn't connected with Tom: her first message goes as a request, then the chat waits.
  await prepare(page, sara);
  await page.goto(`/u/${tom.user.username}`);
  await page.getByRole('link', { name: 'Message', exact: true }).click();
  await expect(page.getByText(/goes to Tom's message requests/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Message' }).fill(`Can I see your studio model? ${run}`);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText(/waiting for Tom to reply/)).toBeVisible();

  // Tom finds it under Message requests and replies, which opens the chat both ways.
  const context = await browser.newContext({ baseURL, viewport: page.viewportSize() });
  const other = await context.newPage();
  await prepare(other, tom);
  await other.goto('/messages');
  await other.getByRole('button', { name: /Message requests/ }).click();
  await other.getByRole('link', { name: new RegExp(`Sara Request ${run}`) }).click();
  await expect(other.getByText(`Can I see your studio model? ${run}`)).toBeVisible();
  await other.getByRole('textbox', { name: 'Message' }).fill('Come by on Friday');
  await other.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Come by on Friday')).toBeVisible();

  // Sara searches the chat, then unsends her first message; it disappears on Tom's screen too.
  await page.reload();
  await page.getByRole('button', { name: 'Chat options' }).click();
  await page.getByRole('menuitem', { name: 'Search chat' }).click();
  const search = page.getByRole('dialog', { name: 'Search chat' });
  await search.getByPlaceholder('Search messages').fill('studio model');
  await expect(search.getByText(`Can I see your studio model? ${run}`)).toBeVisible();
  await search.getByRole('button', { name: 'Close' }).click();
  await expect(search).toBeHidden();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByText(`Can I see your studio model? ${run}`).click({ button: 'right' });
  await page.getByRole('button', { name: 'Unsend' }).click();
  await expect(page.getByText(`Can I see your studio model? ${run}`)).toHaveCount(0);
  await expect(other.getByText(`Can I see your studio model? ${run}`)).toHaveCount(0);
  await context.close();
});
