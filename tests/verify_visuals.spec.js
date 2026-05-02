const { test, expect } = require('@playwright/test');

test.describe('Sound Oscillator Visuals and New Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000');
    // Start the audio context
    await page.locator('#startButton').click();
  });

  test('should have new reverb controls in settings', async ({ page }) => {
    await page.keyboard.press('m');
    const modal = page.locator('#settingsModal');
    await expect(modal).toBeVisible();

    await expect(page.locator('#reverbWetSlider')).toBeVisible();
    await expect(page.locator('#reverbDecaySlider')).toBeVisible();

    await expect(page.getByText('Core Sound')).toBeVisible();
    await expect(page.getByText('Effects')).toBeVisible();
  });

  test('should trigger ripple on visualizer click', async ({ page }) => {
    const visualizer = page.locator('#waveformSvg');

    // Click the visualizer
    await visualizer.click({ position: { x: 100, y: 100 } });

    // Check for circle element (ripple)
    const ripple = visualizer.locator('circle');
    await expect(ripple).toHaveCount(1);
  });
});
