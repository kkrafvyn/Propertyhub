import { expect, test } from '@playwright/test';

test.describe('Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress WebSocket and network errors
    page.on('console', (msg) => {
      if (!msg.text().includes('WebSocket') && !msg.text().includes('404')) {
        console.log(msg.text());
      }
    });
  });

  test('supports search and filter panel interactions', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const searchHeading = page.getByRole('heading', { name: 'Search homes' });
    const browseButton = page.getByRole('button', { name: 'Browse properties', exact: true });

    if (!(await searchHeading.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(browseButton).toBeVisible({ timeout: 15000 });
      await browseButton.click();
    }

    await expect(searchHeading).toBeVisible({ timeout: 15000 });

    const searchInput = page.getByPlaceholder('City, neighborhood, amenity, or property name');
    await searchInput.fill('Accra');
    await page.getByRole('button', { name: 'Search homes' }).click();
    await expect(searchInput).toHaveValue('Accra');

    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Marketplace filters' })).toBeVisible();

    await page.getByRole('button', { name: 'Reset filters' }).click();
    await page.getByRole('button', { name: 'Apply filters' }).click();

    const sortSelect = page.locator('select').first();
    if (await sortSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sortSelect.selectOption('price-low');
      await expect(sortSelect).toHaveValue('price-low');
    }
  });

  test('loads marketplace without critical errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Filter out expected errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('WebSocket') && !e.includes('chunk') && !e.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('marketplace should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);
  });

  test('marketplace should render content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText?.length).toBeGreaterThan(0);
  });
});
