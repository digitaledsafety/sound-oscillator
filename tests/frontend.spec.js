const { test, expect } = require('@playwright/test');

test.describe('Sound Oscillator PWA', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8080');
  });

  test('should display the start overlay initially', async ({ page }) => {
    const overlay = page.locator('#startOverlay');
    await expect(overlay).toBeVisible();

    const startButton = page.locator('#startButton');
    await expect(startButton).toBeVisible();
    await expect(startButton).toHaveText('Start Experience');
  });

  test('should hide the start overlay after clicking the start button', async ({ page }) => {
    const overlay = page.locator('#startOverlay');
    const startButton = page.locator('#startButton');

    await startButton.click();

    // The overlay should be hidden (display: none)
    await expect(overlay).toBeHidden();
  });

  test('should have essential control elements', async ({ page }) => {
    await page.locator('#startButton').click();

    await expect(page.locator('#scaleSelect')).toBeVisible();
    await expect(page.locator('#waveformSelect')).toBeVisible();
    await expect(page.locator('#masterVolume')).toBeVisible();
    await expect(page.locator('#frequencyDisplay')).toBeVisible();
  });
});
