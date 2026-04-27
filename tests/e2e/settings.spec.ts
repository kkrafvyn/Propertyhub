import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedSession } from './utils';

test.describe('Settings', () => {
  test('switches theme and keeps settings actions available', async ({ page }) => {
    await bootstrapAuthenticatedSession(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Search homes' })).toBeVisible({ timeout: 15000 });

    await page.getByTitle('Account menu').click();
    await page.getByRole('menuitem', { name: /^Settings$/ }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await page.getByRole('button', { name: /Preferences/i }).first().click();
    await page.getByRole('button', { name: /^Dark/ }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).first().click();

    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('theme')))
      .toBe('dark');
  });
});
