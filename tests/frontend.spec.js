const { test, expect } = require('@playwright/test');

test.describe('Sound Oscillator Frontend Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Serve the app locally
    await page.goto('http://localhost:8000');
  });

  test('should show start overlay on load', async ({ page }) => {
    const overlay = page.locator('#startOverlay');
    await expect(overlay).toBeVisible();

    const startButton = page.locator('#startButton');
    await expect(startButton).toBeVisible();
    await expect(startButton).toHaveText('Tap to Start');
  });

  test('should hide overlay and show visualizer on start', async ({ page }) => {
    const startButton = page.locator('#startButton');
    await startButton.click();

    const overlay = page.locator('#startOverlay');
    await expect(overlay).toBeHidden();

    const visualizer = page.locator('#waveformSvg');
    await expect(visualizer).toBeVisible();
  });

  test('should have necessary settings controls', async ({ page }) => {
    // Open settings (assuming 'm' key or similar, but let's check if it exists in DOM)
    const modal = page.locator('#settingsModal');

    // Trigger settings modal via keydown 'm'
    await page.keyboard.press('m');
    await expect(modal).toBeVisible();

    await expect(page.locator('#rootNoteSelect')).toBeVisible();
    await expect(page.locator('#scaleSelect')).toBeVisible();
    await expect(page.locator('#waveformSelect')).toBeVisible();
    await expect(page.locator('#volumeSlider')).toBeVisible();
    await expect(page.locator('#delayWetSlider')).toBeVisible();
    await expect(page.locator('#clearAllBtn')).toBeVisible();
  });

  test('should display beta and gamma values', async ({ page }) => {
    await page.keyboard.press('m');
    await expect(page.locator('#betaDisplay')).toContainText('Beta:');
    await expect(page.locator('#gammaDisplay')).toContainText('Gamma:');
  });
});
