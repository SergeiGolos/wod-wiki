import { test } from '@playwright/test';
import { JitCompilerDemoPage } from '../pages/JitCompilerDemoPage';
import { extractRuntimeState } from '../utils/runtime-helpers';
import { RuntimeAssertions } from '../utils/assertion-helpers';

/**
 * Metric inheritance tests
 * Validates that rep schemes and other metrics are properly inherited by child blocks
 */

test.describe('Metric Inheritance', () => {
  test.describe('Variable Rep Scheme Inheritance', () => {
    test('Fran rep inheritance', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Test Round 1: 21 reps
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      let state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentReps(state.stack, 21, 'Round 1 Thrusters');
      await RuntimeAssertions.expectBlockMetric(state.stack, 'reps', 21, 'Round 1 Thrusters');

      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentReps(state.stack, 21, 'Round 1 Pullups');
      await RuntimeAssertions.expectBlockMetric(state.stack, 'reps', 21, 'Round 1 Pullups');

      // Test Round 2: 15 reps
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentReps(state.stack, 15, 'Round 2 Thrusters');
      await RuntimeAssertions.expectBlockMetric(state.stack, 'reps', 15, 'Round 2 Thrusters');

      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentReps(state.stack, 15, 'Round 2 Pullups');
      await RuntimeAssertions.expectBlockMetric(state.stack, 'reps', 15, 'Round 2 Pullups');

      // Test Round 3: 9 reps
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentReps(state.stack, 9, 'Round 3 Thrusters');
      await RuntimeAssertions.expectBlockMetric(state.stack, 'reps', 9, 'Round 3 Thrusters');

      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentReps(state.stack, 9, 'Round 3 Pullups');
      await RuntimeAssertions.expectBlockMetric(state.stack, 'reps', 9, 'Round 3 Pullups');
    });

    test('Annie rep inheritance', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Annie');
      await demoPage.waitForRuntimeReady();

      const expectedReps = [50, 50, 40, 40, 30, 30, 20, 20, 10, 10];

      for (let step = 0; step < expectedReps.length; step++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);
        await RuntimeAssertions.expectCurrentReps(state.stack, expectedReps[step], `Annie step ${step + 1}`);
        await RuntimeAssertions.expectBlockMetric(state.stack, 'reps', expectedReps[step], `Annie step ${step + 1}`);
      }
    });

    test('Linda rep inheritance', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Linda');
      await demoPage.waitForRuntimeReady();

      // Linda: (10-9-8-7-6-5-4-3-2-1) with 3 exercises per round = 30 steps
      const expectedReps = [];
      for (let round = 10; round >= 1; round--) {
        expectedReps.push(round, round, round); // 3 exercises per round
      }

      for (let step = 0; step < expectedReps.length; step++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);
        await RuntimeAssertions.expectCurrentReps(state.stack, expectedReps[step], `Linda step ${step + 1}`);
        await RuntimeAssertions.expectBlockMetric(state.stack, 'reps', expectedReps[step], `Linda step ${step + 1}`);
      }
    });
  });

  test.describe('Fixed Rounds (No Rep Inheritance)', () => {
    test('Barbara no rep metrics', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Barbara');
      await demoPage.waitForRuntimeReady();

      // Execute through several steps
      for (let step = 1; step <= 5; step++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);

        // Barbara should not have rep metrics since it uses fixed rounds without rep schemes
        const currentBlock = state.stack.blocks[state.stack.currentIndex];
        const repsMetric = currentBlock?.metrics.find(m => m.type === 'reps');

        // Reps metric should not exist or should be undefined/null
        test.expect(repsMetric?.value).toBeUndefined();
      }
    });

    test('Helen no rep metrics', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Helen');
      await demoPage.waitForRuntimeReady();

      // Execute through several steps
      for (let step = 1; step <= 5; step++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);

        // Helen should not have rep metrics
        const currentBlock = state.stack.blocks[state.stack.currentIndex];
        const repsMetric = currentBlock?.metrics.find(m => m.type === 'reps');

        test.expect(repsMetric?.value).toBeUndefined();
      }
    });
  });

  test.describe('Time-Based Workouts', () => {
    test('Cindy timer inheritance', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Cindy');
      await demoPage.waitForRuntimeReady();

      const state = await extractRuntimeState(page);

      // Cindy should have timer initialized with 20 minutes
      test.expect(state.timer).toBeDefined();
      test.expect(state.timer?.totalMs).toBe(1200000); // 20 * 60 * 1000
      test.expect(state.timer?.isRunning).toBe(true);

      // Validate timer memory entries
      await RuntimeAssertions.expectMemoryEntry(state.memory, 'timer-time-spans', test.expect.any(Array), undefined, 'Cindy timer spans');
      await RuntimeAssertions.expectMemoryEntry(state.memory, 'timer-is-running', true, undefined, 'Cindy timer running');
    });

    test('Chelsea EMOM timer inheritance', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Chelsea');
      await demoPage.waitForRuntimeReady();

      // Execute first interval
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      const state = await extractRuntimeState(page);

      // Chelsea should have timer initialized with 1 minute intervals
      test.expect(state.timer).toBeDefined();
      test.expect(state.timer?.totalMs).toBe(60000); // 1 * 60 * 1000
      test.expect(state.timer?.isRunning).toBe(true);

      // Should have round tracking for EMOM
      await RuntimeAssertions.expectCurrentRound(state.memory, 1, 'Chelsea round 1');
      await RuntimeAssertions.expectTotalRounds(state.memory, 30, 'Chelsea total rounds');
    });
  });

  test.describe('Complex Workout Inheritance', () => {
    test('Diane rep inheritance', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Diane');
      await demoPage.waitForRuntimeReady();

      // Diane: (21-15-9) Deadlift, Handstand Pushups
      const expectedReps = [21, 21, 15, 15, 9, 9];

      for (let step = 0; step < expectedReps.length; step++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);
        await RuntimeAssertions.expectCurrentReps(state.stack, expectedReps[step], `Diane step ${step + 1}`);
        await RuntimeAssertions.expectBlockMetric(state.stack, 'reps', expectedReps[step], `Diane step ${step + 1}`);
      }
    });

    test('Elizabeth rep inheritance', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Elizabeth');
      await demoPage.waitForRuntimeReady();

      // Elizabeth: (21-15-9) Clean, Ring Dips
      const expectedReps = [21, 21, 15, 15, 9, 9];

      for (let step = 0; step < expectedReps.length; step++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);
        await RuntimeAssertions.expectCurrentReps(state.stack, expectedReps[step], `Elizabeth step ${step + 1}`);
        await RuntimeAssertions.expectBlockMetric(state.stack, 'reps', expectedReps[step], `Elizabeth step ${step + 1}`);
      }
    });
  });

  test.describe('Memory Inheritance Validation', () => {
    test('Round state inheritance', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Execute through rounds and validate memory inheritance
      const expectedRounds = [1, 1, 2, 2, 3, 3];

      for (let step = 0; step < expectedRounds.length; step++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);

        // Validate round memory is accessible to child blocks
        await RuntimeAssertions.expectMemoryEntry(state.memory, 'rounds-current', expectedRounds[step], undefined, `Step ${step + 1}`);
        await RuntimeAssertions.expectMemoryEntry(state.memory, 'rounds-total', 3, undefined, `Step ${step + 1}`);

        // Validate memory counts remain consistent
        await RuntimeAssertions.expectMemoryCountByType(state.memory, 'rounds-current', 1, `Step ${step + 1}`);
        await RuntimeAssertions.expectMemoryCountByType(state.memory, 'rounds-total', 1, `Step ${step + 1}`);
      }
    });

    test('Block-specific memory isolation', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Execute a few steps and validate memory ownership
      for (let step = 1; step <= 3; step++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);

        // Each memory entry should have an owner
        const entriesWithoutOwner = state.memory.entries.filter(e => !e.ownerId);
        test.expect(entriesWithoutOwner.length).toBe(0);

        // Validate that current block owns some memory
        const currentBlock = state.stack.blocks[state.stack.currentIndex];
        const blockMemory = state.memory.entries.filter(e => e.ownerId === currentBlock.key);
        test.expect(blockMemory.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Metric Display Validation', () => {
    test('Rep metrics are displayed correctly', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Start workout
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      // Take screenshot to verify visual display
      await demoPage.takeScreenshot('fran-reps-display');

      // Validate that rep information is visible in the UI
      const repsText = await page.locator('text=/21/').first();
      await test.expect(repsText).toBeVisible();
    });

    test('Round information is displayed', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Start workout
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      // Take screenshot to verify visual display
      await demoPage.takeScreenshot('fran-round-display');

      // Validate that round information is visible
      const roundText = await page.locator('text=/Round 1/').first();
      await test.expect(roundText).toBeVisible();
    });
  });
});