import { test } from '@playwright/test';
import { JitCompilerDemoPage } from '../pages/JitCompilerDemoPage';

/**
 * Visual regression tests
 * Validates that runtime state displays correctly in the UI
 */

test.describe('Visual Regression Tests', () => {
  test.describe('Stack Visualization', () => {
    test('Fran initial state', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Take baseline screenshot
      await demoPage.takeScreenshot('fran-initial-stack');
    });

    test('Fran during execution', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Execute to Round 2
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      await demoPage.takeScreenshot('fran-round2-stack');
    });

    test('Fran completion state', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Execute to completion
      for (let i = 0; i < 7; i++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();
      }

      await demoPage.takeScreenshot('fran-complete-stack');
    });
  });

  test.describe('Memory Visualization', () => {
    test('Fran memory state progression', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Initial state
      await demoPage.takeScreenshot('fran-initial-memory');

      // After first exercise
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      await demoPage.takeScreenshot('fran-after-thrusters-memory');

      // After first round complete
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      await demoPage.takeScreenshot('fran-round1-complete-memory');

      // After round 2 start
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      await demoPage.takeScreenshot('fran-round2-start-memory');
    });

    test('Barbara memory state', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Barbara');
      await demoPage.waitForRuntimeReady();

      // Initial state
      await demoPage.takeScreenshot('barbara-initial-memory');

      // After first round
      for (let i = 0; i < 4; i++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();
      }
      await demoPage.takeScreenshot('barbara-round1-complete-memory');
    });
  });

  test.describe('Timer Display', () => {
    test('Cindy timer display', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Cindy');
      await demoPage.waitForRuntimeReady();

      // Initial timer state
      await demoPage.takeScreenshot('cindy-initial-timer');

      // Wait a moment for timer to update
      await page.waitForTimeout(2000);
      await demoPage.takeScreenshot('cindy-running-timer');
    });

    test('Chelsea EMOM timer display', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Chelsea');
      await demoPage.waitForRuntimeReady();

      // Initial state
      await demoPage.takeScreenshot('chelsea-initial-timer');

      // After first interval
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      await demoPage.takeScreenshot('chelsea-interval1-timer');
    });
  });

  test.describe('Script Editor', () => {
    test('Fran script highlighting', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Initial script display
      await demoPage.takeScreenshot('fran-script-initial');

      // Start execution to see highlighting
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      await demoPage.takeScreenshot('fran-script-highlighted');
    });

    test('Parsed fragments display', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Parsed workout display
      await demoPage.takeScreenshot('fran-parsed-fragments');
    });
  });

  test.describe('Button States', () => {
    test('Next Block button states', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Initial button state
      await demoPage.takeScreenshot('button-initial-state');

      // Click and capture processing state
      await demoPage.clickNextBlock();
      await page.waitForTimeout(500); // Capture during processing
      await demoPage.takeScreenshot('button-processing-state');

      // Wait for completion
      await demoPage.waitForProcessingComplete();
      await demoPage.takeScreenshot('button-ready-state');
    });

    test('Button with queued clicks', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Rapid clicks
      await demoPage.clickNextBlock();
      await demoPage.clickNextBlock();
      await demoPage.clickNextBlock();

      await page.waitForTimeout(500);
      await demoPage.takeScreenshot('button-queued-clicks');

      await demoPage.waitForProcessingComplete();
      await demoPage.takeScreenshot('button-after-queued-clicks');
    });
  });

  test.describe('Error States', () => {
    test('Invalid script display', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Set invalid script
      await demoPage.setScript('invalid {{{ script }}}');
      await page.waitForTimeout(1000);

      await demoPage.takeScreenshot('invalid-script-display');
    });

    test('Empty script display', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Set empty script
      await demoPage.setScript('');
      await page.waitForTimeout(1000);

      await demoPage.takeScreenshot('empty-script-display');
    });
  });

  test.describe('Responsive Layout', () => {
    test('Mobile viewport', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      await demoPage.takeScreenshot('fran-mobile-layout');
    });

    test('Tablet viewport', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      await demoPage.takeScreenshot('fran-tablet-layout');
    });

    test('Desktop viewport', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      await demoPage.takeScreenshot('fran-desktop-layout');
    });
  });

  test.describe('Theme Consistency', () => {
    test('Light theme display', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      await demoPage.takeScreenshot('fran-light-theme');
    });

    // Note: Dark theme test would require theme switching functionality
    // test('Dark theme display', async ({ page }) => {
    //   // Implementation would depend on theme switching UI
    // });
  });

  test.describe('Animation States', () => {
    test('Transition animations', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Capture before click
      await demoPage.takeScreenshot('fran-before-transition');

      // Click and capture immediately
      await demoPage.clickNextBlock();
      await page.waitForTimeout(100); // Capture during transition
      await demoPage.takeScreenshot('fran-during-transition');

      // Wait for completion
      await demoPage.waitForProcessingComplete();
      await demoPage.takeScreenshot('fran-after-transition');
    });
  });
});
