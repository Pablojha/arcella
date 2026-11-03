import { expect, test } from '@playwright/test';
import { newMember, prepare, verifyAt } from './helpers.js';

const UNDERGRADUATE = { role: 'student', level: 'undergraduate', degree: 'B.Arch', batch: 2022 };

test.describe('several colleges and group chats', () => {
  test.describe.configure({ timeout: 180_000 });

  test('members add colleges to their education, verify them and switch between their groups', async ({ page }) => {
    const member = await newMember('Education Tester');
    await verifyAt(member, 'IIT Roorkee', UNDERGRADUATE);
    await prepare(page, member);
    await page.goto(`/u/${member.user.username}`);
    await expect(page.getByText('B.Arch · Undergraduate')).toBeVisible();
    await expect(page.getByText('Main', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Add education' });
    await sheet.getByPlaceholder('Search by name, short name or city').fill('SPA Delhi');
    await sheet.getByRole('button', { name: /School of Planning and Architecture, New Delhi/ }).click();
    await sheet.getByRole('button', { name: /Postgraduate/ }).click();
    await sheet.getByLabel('Degree').fill('M.Arch');
    await sheet.getByLabel('Batch year').selectOption('2026');
    await sheet.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Added to your education')).toBeVisible();
    await expect(page.getByText('M.Arch · Postgraduate')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Verify to join the group' })).toBeVisible();

    // The code sent to the SPA address is confirmed through the API, as the verification page does.
    await verifyAt(member, 'SPA Delhi', { role: 'student', level: 'postgraduate', degree: 'M.Arch', batch: 2026 });
    await page.goto('/college');
    const switcher = page.getByRole('navigation', { name: 'Your colleges' });
    await expect(switcher.getByRole('link', { name: 'IIT Roorkee' })).toHaveAttribute('aria-current', 'page');
    await switcher.getByRole('link', { name: 'SPA Delhi' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('School of Planning and Architecture, New Delhi');
    await switcher.getByRole('link', { name: 'IIT Roorkee' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Indian Institute of Technology Roorkee');
  });

  test('group chat works like direct messages: live messages, sender names and reactions', async ({ page, browser }) => {
    const [asha, bilal] = await Promise.all([newMember('Asha Groupchat'), newMember('Bilal Groupchat')]);
    await Promise.all([verifyAt(asha, 'IIT Roorkee', UNDERGRADUATE), verifyAt(bilal, 'IIT Roorkee', UNDERGRADUATE)]);
    const other = await browser.newPage();
    await Promise.all([prepare(page, asha), prepare(other, bilal)]);
    await Promise.all([page.goto('/college?tab=chat'), other.goto('/college?tab=chat')]);
    await expect(other.getByRole('textbox', { name: 'Message' })).toBeVisible();

    const text = `Studio at 9? ${Date.now()}`;
    await page.getByRole('textbox', { name: 'Message' }).fill(text);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    // Bilal's chat was already open: the message arrives live, with Asha's name above it.
    await expect(other.getByText(text)).toBeVisible();
    await expect(other.getByRole('link', { name: 'Asha Groupchat' }).last()).toBeVisible();

    await other.getByText(text).click({ button: 'right' });
    await other.getByRole('menuitem', { name: 'React with 👍' }).click();
    const pill = page.getByRole('button', { name: 'See who reacted' }).last();
    await expect(pill).toContainText('👍');
    await pill.click();
    await expect(page.getByRole('dialog', { name: 'Reactions' }).getByText('Bilal Groupchat')).toBeVisible();
    await other.close();
  });
});
