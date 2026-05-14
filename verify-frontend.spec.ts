import { test, expect } from '@playwright/test';

test('Verify Tariff Form has new fee inputs', async ({ page }) => {
  await page.goto('http://localhost:3002/admin/tariffs/new'); // Assuming this route exists

  // Wait for the form to load
  await page.waitForSelector('form');

  // Verify elements exist
  const timeFeeInput = page.locator('input#time_fee');
  await expect(timeFeeInput).toBeVisible();

  const idleFeeInput = page.locator('input#idle_fee');
  await expect(idleFeeInput).toBeVisible();

  // Take a screenshot
  await page.screenshot({ path: 'frontend-tariff-form.png', fullPage: true });
});
