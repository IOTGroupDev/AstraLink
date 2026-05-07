import { expect, test } from '@playwright/test';

test('renders the Expo web app', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toHaveText('');
});
