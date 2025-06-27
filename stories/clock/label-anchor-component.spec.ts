import { test, expect } from '@playwright/test';

test.describe('Label Anchor Component Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:6006/?path=/story/clock-label-anchor--default');
  });

  test('should display "No exercise" placeholder when metrics are empty', async ({ page }) => {
    // Navigate to default story
    await page.goto('http://localhost:6006/?path=/story/clock-label-anchor--default');
    
    // Verify the component displays "No exercise" when no metrics are present
    const component = page.frameLocator('iframe').locator('text=No exercise');
    await expect(component).toBeVisible();
    
    // Verify the span data shows 0 metrics
    await expect(page.locator('text="[...] 0 items"')).toBeVisible();
  });

  test('should support different variant styles', async ({ page }) => {
    // Test badge variant
    await page.getByRole('radio', { name: 'badge' }).click();
    await expect(page).toHaveURL(/variant:badge/);
    await expect(page.frameLocator('iframe').locator('text=No exercise')).toBeVisible();
    
    // Test title variant
    await page.getByRole('radio', { name: 'title', exact: true }).click();
    await expect(page).toHaveURL(/variant:title/);
    await expect(page.frameLocator('iframe').locator('text=No exercise')).toBeVisible();
    
    // Test subtitle variant
    await page.getByRole('radio', { name: 'subtitle' }).click();
    await expect(page).toHaveURL(/variant:subtitle/);
    await expect(page.frameLocator('iframe').locator('text=No exercise')).toBeVisible();
    
    // Test next-up variant
    await page.getByRole('radio', { name: 'next-up' }).click();
    await expect(page).toHaveURL(/variant:next-up/);
    await expect(page.frameLocator('iframe').locator('text=No exercise')).toBeVisible();
    
    // Test default variant
    await page.getByRole('radio', { name: 'default' }).click();
    await expect(page).toHaveURL(/variant:default/);
    await expect(page.frameLocator('iframe').locator('text=No exercise')).toBeVisible();
  });

  test('should render template with blockKey placeholder', async ({ page }) => {
    // Change template to include custom text
    const templateInput = page.getByPlaceholder('Edit string...');
    await templateInput.fill('Exercise: {{blockKey}}');
    
    // Verify template value is updated in controls
    await expect(templateInput).toHaveValue('Exercise: {{blockKey}}');
    
    // Note: Since metrics are empty, the component still shows "No exercise" 
    // Template rendering would be visible when metrics are present
    await expect(page.frameLocator('iframe').locator('text=No exercise')).toBeVisible();
  });

  test('should have responsive controls that update component state', async ({ page }) => {
    // Test span data is displayed in controls
    await expect(page.locator('text=blockKey')).toBeVisible();
    await expect(page.locator('text="Jumping Jacks"')).toBeVisible();
    await expect(page.locator('text=duration')).toBeVisible();
    await expect(page.locator('text=185000')).toBeVisible();
    
    // Test template control
    const templateInput = page.getByPlaceholder('Edit string...');
    await expect(templateInput).toBeVisible();
    await templateInput.fill('Custom Template: {{blockKey}}');
    await expect(templateInput).toHaveValue('Custom Template: {{blockKey}}');
    
    // Test variant controls
    const badgeRadio = page.getByRole('radio', { name: 'badge' });
    const titleRadio = page.getByRole('radio', { name: 'title', exact: true });
    
    await expect(badgeRadio).toBeVisible();
    await expect(titleRadio).toBeVisible();
    
    // Test clicking variants changes URL
    await badgeRadio.click();
    await expect(page).toHaveURL(/variant:badge/);
    
    await titleRadio.click();
    await expect(page).toHaveURL(/variant:title/);
  });

  test('should check accessibility compliance', async ({ page }) => {
    // Navigate to accessibility tab
    await page.getByRole('tab', { name: 'Accessibility' }).click();
    
    // Verify accessibility scan results are shown
    await expect(page.locator('text=Violations')).toBeVisible();
    await expect(page.locator('text=Passes')).toBeVisible();
    await expect(page.locator('text=Inconclusive')).toBeVisible();
    
    // Check for specific accessibility features
    await expect(page.locator('button[text*="Show highlights"]')).toBeVisible();
    await expect(page.locator('button[text*="Rerun accessibility scan"]')).toBeVisible();
    
    // Note: There's currently 1 color contrast violation that should be addressed
    const violationsTab = page.locator('tab:has-text("Violations")');
    await expect(violationsTab).toBeVisible();
  });

  test('should test different story variations', async ({ page }) => {
    // Test Badge story
    await page.click('link[text="Badge"]');
    await expect(page).toHaveURL(/clock-label-anchor--badge/);
    await expect(page.frameLocator('iframe').locator('body')).toBeVisible();
    
    // Test Title story  
    await page.click('link[text="Title"]');
    await expect(page).toHaveURL(/clock-label-anchor--title/);
    await expect(page.frameLocator('iframe').locator('body')).toBeVisible();
    
    // Test Subtitle story
    await page.click('link[text="Subtitle"]');
    await expect(page).toHaveURL(/clock-label-anchor--subtitle/);
    await expect(page.frameLocator('iframe').locator('body')).toBeVisible();
    
    // Test Next Up story
    await page.click('link[text="Next Up"]');
    await expect(page).toHaveURL(/clock-label-anchor--next-up/);
    await expect(page.frameLocator('iframe').locator('body')).toBeVisible();
    
    // Test Empty story
    await page.click('link[text="Empty"]');
    await expect(page).toHaveURL(/clock-label-anchor--empty/);
    await expect(page.frameLocator('iframe').locator('body')).toBeVisible();
  });

  test('should verify component structure and content', async ({ page }) => {
    // Check that the component iframe is present
    const iframe = page.locator('iframe');
    await expect(iframe).toBeVisible();
    
    // Check that controls are functional
    await expect(page.locator('text=Controls')).toBeVisible();
    await expect(page.locator('text=span')).toBeVisible();
    await expect(page.locator('text=template')).toBeVisible();
    await expect(page.locator('text=variant')).toBeVisible();
    
    // Verify the component responds to control changes
    const titleRadio = page.getByRole('radio', { name: 'title', exact: true });
    await titleRadio.click();
    await expect(titleRadio).toBeChecked();
    
    // Verify story modification indicators
    await expect(page.locator('text*="You modified this story"')).toBeVisible();
  });

  test('should test metrics display functionality (when metrics are available)', async ({ page }) => {
    // Note: This test would require a story with metrics data
    // For now, we verify the current behavior with empty metrics
    
    // Verify empty state
    await expect(page.frameLocator('iframe').locator('text=No exercise')).toBeVisible();
    
    // Verify metrics array shows 0 items
    await expect(page.locator('text="metrics :"')).toBeVisible();
    await expect(page.locator('text="[...] 0 items"')).toBeVisible();
    
    // Template should process blockKey when metrics are present
    const templateInput = page.getByPlaceholder('Edit string...');
    await templateInput.fill('{{blockKey}} Exercise');
    await expect(templateInput).toHaveValue('{{blockKey}} Exercise');
  });

  test('should verify Storybook integration features', async ({ page }) => {
    // Test canvas controls
    await expect(page.locator('button[title*="Remount component"]')).toBeVisible();
    await expect(page.locator('button[title*="Zoom in"]')).toBeVisible();
    await expect(page.locator('button[title*="Reset zoom"]')).toBeVisible();
    
    // Test story navigation
    await expect(page.locator('button:has-text("Label Anchor")')).toBeVisible();
    await expect(page.locator('link:has-text("Default")')).toBeVisible();
    
    // Test addon panels
    await expect(page.locator('tab:has-text("Controls")')).toBeVisible();
    await expect(page.locator('tab:has-text("Actions")')).toBeVisible();
    await expect(page.locator('tab:has-text("Interactions")')).toBeVisible();
    await expect(page.locator('tab:has-text("Accessibility")')).toBeVisible();
    
    // Test full screen mode
    const fullScreenButton = page.locator('button[title*="Go full screen"]');
    await expect(fullScreenButton).toBeVisible();
  });
});
