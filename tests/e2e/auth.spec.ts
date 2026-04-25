import { expect, test } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('supports signup-to-login navigation and form interaction', async ({ page }) => {
    await page.addInitScript(() => {
      const nativeSetTimeout = window.setTimeout;
      window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: any[]) => {
        const effectiveTimeout = timeout === 3000 ? 0 : timeout;
        return nativeSetTimeout(handler, effectiveTimeout, ...args);
      }) as typeof window.setTimeout;
    });

    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Create account' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Create account' }).first().click();

    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

    await page.getByLabel('Full name').fill('E2E Signup User');
    await page.getByLabel('Email').fill('signup.e2e@propertyhub.test');
    await page.getByLabel('Password').fill('StrongPassword123!');

    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Continue to your account' })).toBeVisible();

    await page.getByLabel('Email').fill('signup.e2e@propertyhub.test');
    await page.getByLabel('Password').fill('StrongPassword123!');
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled();
  });
});
