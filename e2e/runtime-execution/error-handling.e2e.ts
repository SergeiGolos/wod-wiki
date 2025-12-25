import { test } from '@playwright/test';
import { JitCompilerDemoPage } from '../pages/JitCompilerDemoPage';
import { extractRuntimeState } from '../utils/runtime-helpers';
import { RuntimeAssertions, ErrorAssertions } from '../utils/assertion-helpers';

/**
 * Error handling tests
 * Validates runtime behavior under error conditions and edge cases
 */

test.describe('Runtime Error Handling', () => {
  test.describe('Invalid Script Handling', () => {
    test('Malformed workout script', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Set malformed script
      await demoPage.setScript('invalid {{{ malformed script }}}');

      // Wait for parsing attempt
      await page.waitForTimeout(2000);

      const state = await extractRuntimeState(page);

      // Should handle gracefully without crashing
      await RuntimeAssertions.expectScriptValid(state, 'invalid {{{ malformed script }}}', 'Malformed script');
    });

    test('Empty script handling', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Set empty script
      await demoPage.setScript('');

      await page.waitForTimeout(1000);

      const state = await extractRuntimeState(page);

      // Should handle empty script gracefully
      test.expect(state.script.content).toBe('');
      test.expect(state.script.parsedFragments.length).toBe(0);
    });

    test('Incomplete workout script', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Set incomplete script
      await demoPage.setScript('(3) Pullups');

      await page.waitForTimeout(1000);

      const state = await extractRuntimeState(page);

      // Should parse incomplete script
      await RuntimeAssertions.expectScriptValid(state, '(3) Pullups', 'Incomplete script');
      await RuntimeAssertions.expectParsedFragments(state, 2, 'Incomplete script'); // Rounds + Pullups
    });
  });

  test.describe('Rapid Interaction Handling', () => {
    test('Multiple rapid Next Block clicks', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Click Next Block multiple times rapidly
      await demoPage.clickNextBlock();
      await demoPage.clickNextBlock();
      await demoPage.clickNextBlock();
      await demoPage.clickNextBlock();

      // Wait for processing to complete
      await demoPage.waitForProcessingComplete();

      const state = await extractRuntimeState(page);

      // Should have progressed through multiple steps without breaking
      await RuntimeAssertions.expectCurrentRound(state.memory, 3, 'After rapid clicks');
      await RuntimeAssertions.expectStackDepth(state.stack, 2, 'After rapid clicks');
    });

    test('Next Block clicks during processing', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Click once and immediately click again
      await demoPage.clickNextBlock();

      // Click again while first is processing
      await page.waitForTimeout(100); // Small delay to ensure processing started
      await demoPage.clickNextBlock();

      // Wait for all processing to complete
      await demoPage.waitForProcessingComplete();

      const state = await extractRuntimeState(page);

      // Should handle queued clicks properly
      test.expect(state.stack.depth).toBeGreaterThan(0);
      await ErrorAssertions.expectNoRuntimeErrors(state, 'Queued clicks');
    });

    test('Excessive Next Block clicks', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Click more times than the workout has steps
      for (let i = 0; i < 10; i++) {
        await demoPage.clickNextBlock();
      }

      await demoPage.waitForProcessingComplete();

      const state = await extractRuntimeState(page);

      // Should complete workout and handle extra clicks gracefully
      await RuntimeAssertions.expectWorkoutComplete(state, 'Excessive clicks');
    });
  });

  test.describe('Runtime State Corruption', () => {
    test('Memory allocation failures', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Execute a few steps
      for (let i = 0; i < 3; i++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();
      }

      const state = await extractRuntimeState(page);

      // Validate memory integrity
      await ErrorAssertions.expectNoRuntimeErrors(state, 'Memory integrity');

      // All memory entries should be valid
      const invalidEntries = state.memory.entries.filter(e => !e.isValid);
      test.expect(invalidEntries.length).toBe(0);

      // Should have expected memory structure
      test.expect(state.memory.totalAllocated).toBeGreaterThan(0);
      test.expect(Object.keys(state.memory.summary.byType).length).toBeGreaterThan(0);
    });

    test('Stack consistency under stress', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Barbara'); // Longer workout
      await demoPage.waitForRuntimeReady();

      // Execute through workout with rapid clicks
      for (let round = 1; round <= 5; round++) {
        for (let exercise = 1; exercise <= 4; exercise++) {
          await demoPage.clickNextBlock();
          await demoPage.waitForProcessingComplete();

          const state = await extractRuntimeState(page);

          // Validate stack consistency
          test.expect(state.stack.depth).toBe(2);
          test.expect(state.stack.currentIndex).toBe(1);
          test.expect(state.stack.blocks.length).toBe(2);
        }
      }

      // Final completion
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      const finalState = await extractRuntimeState(page);
      await RuntimeAssertions.expectWorkoutComplete(finalState, 'Barbara stress test');
    });
  });

  test.describe('Timer Error Handling', () => {
    test('Timer initialization failures', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Cindy');
      await demoPage.waitForRuntimeReady();

      const state = await extractRuntimeState(page);

      // Timer should be properly initialized
      test.expect(state.timer).toBeDefined();
      test.expect(state.timer?.isRunning).toBe(true);
      test.expect(state.timer?.elapsedMs).toBeGreaterThanOrEqual(0);
    });

    test('EMOM timer resets', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Chelsea');
      await demoPage.waitForRuntimeReady();

      // Execute through first few intervals
      for (let interval = 1; interval <= 3; interval++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);

        // Each interval should reset timer
        test.expect(state.timer).toBeDefined();
        test.expect(state.timer?.totalMs).toBe(60000); // 1 minute
        test.expect(state.timer?.isRunning).toBe(true);
      }
    });
  });

  test.describe('Network and Loading Errors', () => {
    test('Slow network handling', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.continue();
      });

      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Should still work with slow network
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      const state = await extractRuntimeState(page);
      await RuntimeAssertions.expectStackDepth(state.stack, 2, 'Slow network');
    });

    test('Page refresh during execution', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Execute a few steps
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      // Refresh page
      await page.reload();
      await demoPage.waitForRuntimeReady();

      // Should reinitialize properly
      const state = await extractRuntimeState(page);
      await RuntimeAssertions.expectStackDepth(state.stack, 1, 'After refresh'); // Just root block
    });
  });

  test.describe('Boundary Conditions', () => {
    test('Single exercise workouts', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Set single exercise workout
      await demoPage.setScript('30 Clean & Jerk 135lb');

      await page.waitForTimeout(1000);

      const state = await extractRuntimeState(page);
      await RuntimeAssertions.expectScriptValid(state, '30 Clean & Jerk 135lb', 'Single exercise');
    });

    test('Zero rep workouts', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Set workout with zero reps (edge case)
      await demoPage.setScript('(0) Pushups');

      await page.waitForTimeout(1000);

      const state = await extractRuntimeState(page);
      await RuntimeAssertions.expectScriptValid(state, '(0) Pushups', 'Zero reps');
    });

    test('Very large rep numbers', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Set workout with very large reps
      await demoPage.setScript('10000 Pushups');

      await page.waitForTimeout(1000);

      const state = await extractRuntimeState(page);
      await RuntimeAssertions.expectScriptValid(state, '10000 Pushups', 'Large reps');
    });
  });

  test.describe('Concurrent Operations', () => {
    test('Multiple browser tabs', async ({ context, page }) => {
      const demoPage1 = new JitCompilerDemoPage(page);

      // Open second tab
      const page2 = await context.newPage();
      const demoPage2 = new JitCompilerDemoPage(page2);

      // Start workouts in both tabs
      await demoPage1.gotoWorkout('Fran');
      await demoPage1.waitForRuntimeReady();

      await demoPage2.gotoWorkout('Annie');
      await demoPage2.waitForRuntimeReady();

      // Execute in both tabs simultaneously
      await Promise.all([
        demoPage1.clickNextBlock(),
        demoPage2.clickNextBlock()
      ]);

      await Promise.all([
        demoPage1.waitForProcessingComplete(),
        demoPage2.waitForProcessingComplete()
      ]);

      // Both should work independently
      const state1 = await extractRuntimeState(page);
      const state2 = await extractRuntimeState(page2);

      await RuntimeAssertions.expectStackDepth(state1.stack, 2, 'Tab 1');
      await RuntimeAssertions.expectStackDepth(state2.stack, 2, 'Tab 2');
    });

    test('Script editing during execution', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Start execution
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      // Edit script while executing
      await demoPage.setScript('20 Pushups');

      // Continue execution
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      const state = await extractRuntimeState(page);

      // Should handle script changes gracefully
      test.expect(state.stack.depth).toBeGreaterThanOrEqual(1);
    });
  });
});