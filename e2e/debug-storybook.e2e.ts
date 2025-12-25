import { test, expect } from '@playwright/test';

test('debug storybook crash', async ({ page }) => {
  // Listen for console logs
  page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.type()}: ${msg.text()}`));
  
  // Listen for page errors (uncaught exceptions)
  page.on('pageerror', exception => {
    console.log(`BROWSER PAGE ERROR: ${exception}`);
  });

  // Listen for failed requests
  page.on('requestfailed', request => {
    console.log(`BROWSER REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });

  console.log('Navigating to Storybook...');
  try {
    await page.goto('http://localhost:6006/?path=/story/markdown-editor--default', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log('Navigation completed.');
  } catch (e) {
    console.log('Navigation failed or timed out:', e);
  }

  // Wait a bit to capture any delayed errors
  await page.waitForTimeout(5000);
  
  // Check if the root element exists (Storybook usually has #root or #storybook-root)
  const root = await page.$('#storybook-root');
  if (root) {
      console.log('Storybook root element found.');
  } else {
      console.log('Storybook root element NOT found.');
  }
});
