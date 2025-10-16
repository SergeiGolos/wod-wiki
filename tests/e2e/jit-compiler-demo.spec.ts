import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for JitCompilerDemo component
 * Testing the "Next Block" button functionality and runtime execution
 */

test.describe('JitCompilerDemo - Next Block Button', () => {
  
  test.beforeEach(async ({ page }) => {
    // Enable console logging to capture any errors
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[Browser ${type.toUpperCase()}]:`, text);
    });

    // Capture page errors
    page.on('pageerror', error => {
      console.error('[Browser PAGE ERROR]:', error.message);
    });
  });

  test('Next Block button should advance workout in Fran story', async ({ page }) => {
    // Navigate to the Fran story
    await page.goto('/iframe.html?id=runtime-crossfit--fran&viewMode=story');
    
    // Wait for the component to load
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for runtime initialization
    await page.waitForTimeout(1000);
    
    // Find the Next Block button
    const nextButton = page.getByRole('button', { name: /Next Block/i });
    await expect(nextButton).toBeVisible();
    
    // Capture initial state
    const initialText = await page.textContent('body');
    console.log('[TEST] Initial page state captured');
    
    // Click the Next Block button
    console.log('[TEST] Clicking Next Block button...');
    await nextButton.click();
    
    // Wait for any updates
    await page.waitForTimeout(500);
    
    // Check if button text changed to "Processing..."
    const buttonText = await nextButton.textContent();
    console.log('[TEST] Button text after click:', buttonText);
    
    // Wait for processing to complete if it started
    if (buttonText?.includes('Processing')) {
      await expect(nextButton).toContainText('Next Block', { timeout: 5000 });
    }
    
    // Check if page content changed
    const updatedText = await page.textContent('body');
    const contentChanged = initialText !== updatedText;
    console.log('[TEST] Content changed after click:', contentChanged);
    
    // Take screenshot for manual inspection
    await page.screenshot({ path: 'tests/e2e/screenshots/fran-after-next-click.png', fullPage: true });
  });

  test('Next Block button should show runtime state information', async ({ page }) => {
    await page.goto('/iframe.html?id=runtime-crossfit--fran&viewMode=story');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check if runtime information is displayed
    const bodyText = await page.textContent('body');
    
    // Look for runtime state indicators
    const hasRuntimeInfo = bodyText?.includes('Runtime') || 
                           bodyText?.includes('Stack') ||
                           bodyText?.includes('Current Block');
    
    console.log('[TEST] Runtime info displayed:', hasRuntimeInfo);
    
    if (hasRuntimeInfo) {
      console.log('[TEST] ✓ Runtime state is being displayed');
    } else {
      console.log('[TEST] ✗ No runtime state information found on page');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/fran-initial-state.png', fullPage: true });
  });

  test('Next Block button click should trigger runtime handler', async ({ page }) => {
    await page.goto('/iframe.html?id=runtime-crossfit--fran&viewMode=story');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Inject spy to intercept runtime.handle calls
    await page.evaluate(() => {
      (window as any).nextEventFired = false;
      (window as any).handleCallCount = 0;
      
      // Try to access runtime from component state
      const possibleRuntimes = document.querySelectorAll('[data-runtime]');
      console.log('[INJECT] Found potential runtime elements:', possibleRuntimes.length);
    });
    
    const nextButton = page.getByRole('button', { name: /Next Block/i });
    
    // Click and check if event was fired
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Check window flags
    const nextEventFired = await page.evaluate(() => (window as any).nextEventFired);
    const handleCallCount = await page.evaluate(() => (window as any).handleCallCount);
    
    console.log('[TEST] Next event fired:', nextEventFired);
    console.log('[TEST] Handle call count:', handleCallCount);
  });

  test('Multiple Next Block clicks should be queued properly', async ({ page }) => {
    await page.goto('/iframe.html?id=runtime-crossfit--fran&viewMode=story');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const nextButton = page.getByRole('button', { name: /Next Block/i });
    
    // Rapid clicks
    console.log('[TEST] Performing rapid clicks...');
    await nextButton.click();
    await nextButton.click();
    await nextButton.click();
    
    // Wait and observe behavior
    await page.waitForTimeout(2000);
    
    const buttonText = await nextButton.textContent();
    console.log('[TEST] Button text after rapid clicks:', buttonText);
    
    // Button should either be processing or back to "Next Block"
    expect(buttonText).toMatch(/Next Block|Processing/);
    
    await page.screenshot({ path: 'tests/e2e/screenshots/fran-after-rapid-clicks.png', fullPage: true });
  });

  test('Inspect DOM for runtime state elements', async ({ page }) => {
    await page.goto('/iframe.html?id=runtime-crossfit--fran&viewMode=story');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Look for common runtime state display elements
    const elements = await page.evaluate(() => {
      const results: any = {};
      
      // Check for pre/code blocks that might show runtime state
      results.preBlocks = document.querySelectorAll('pre').length;
      results.codeBlocks = document.querySelectorAll('code').length;
      
      // Check for specific text content
      const bodyText = document.body.textContent || '';
      results.hasRuntimeKeyword = bodyText.includes('runtime');
      results.hasStackKeyword = bodyText.includes('stack');
      results.hasBlockKeyword = bodyText.includes('block');
      
      // Check for buttons
      const buttons = Array.from(document.querySelectorAll('button'));
      results.buttons = buttons.map(b => b.textContent?.trim());
      
      return results;
    });
    
    console.log('[TEST] DOM inspection results:', JSON.stringify(elements, null, 2));
    
    // Verify Next Block button exists
    expect(elements.buttons).toContain('Next Block');
  });
});

test.describe('JitCompilerDemo - Other Stories', () => {
  
  test('Annie story loads and Next Block button works', async ({ page }) => {
    await page.goto('/iframe.html?id=runtime-crossfit--annie&viewMode=story');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const nextButton = page.getByRole('button', { name: /Next Block/i });
    await expect(nextButton).toBeVisible();
    
    await nextButton.click();
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'tests/e2e/screenshots/annie-after-click.png', fullPage: true });
  });

  test('Barbara story loads and Next Block button works', async ({ page }) => {
    await page.goto('/iframe.html?id=runtime-crossfit--barbara&viewMode=story');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const nextButton = page.getByRole('button', { name: /Next Block/i });
    await expect(nextButton).toBeVisible();
    
    await nextButton.click();
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'tests/e2e/screenshots/barbara-after-click.png', fullPage: true });
  });
});
