import { test, expect } from '@playwright/test';
import { JitCompilerDemoPage } from '../pages/JitCompilerDemoPage';
import { extractRuntimeState, waitForWorkoutCompletion } from '../utils/runtime-helpers';
import { RuntimeAssertions, WorkoutAssertions } from '../utils/assertion-helpers';
import { VARIABLE_REP_WORKOUTS, FIXED_ROUNDS_WORKOUTS, TIME_BASED_WORKOUTS } from '../fixtures/workout-data';

/**
 * Basic runtime execution tests
 * Validates fundamental workout execution behavior
 */

test.describe('Basic Runtime Execution', () => {
  test.describe('Variable Rep Workouts', () => {
    VARIABLE_REP_WORKOUTS.forEach(workout => {
      test(`${workout.name} - Complete execution`, async ({ page }) => {
        const demoPage = new JitCompilerDemoPage(page);

        // Navigate to workout
        await demoPage.gotoWorkout(workout.name);
        await demoPage.waitForRuntimeReady();

        // Execute all expected next() calls
        for (let step = 1; step <= workout.expectedNextCalls; step++) {
          await demoPage.clickNextBlock();
          await demoPage.waitForProcessingComplete();

          // Validate state at each step if validation steps are defined
          if (workout.validationSteps && workout.validationSteps[step - 1]) {
            const expected = workout.validationSteps[step - 1];
            const actual = await extractRuntimeState(page);

            if (expected.expectedStackDepth !== undefined) {
              await RuntimeAssertions.expectStackDepth(actual.stack, expected.expectedStackDepth, `Step ${step}`);
            }

            if (expected.expectedCurrentRound !== undefined) {
              await RuntimeAssertions.expectCurrentRound(actual.memory, expected.expectedCurrentRound, `Step ${step}`);
            }

            if (expected.expectedReps !== undefined) {
              await RuntimeAssertions.expectCurrentReps(actual.stack, expected.expectedReps, `Step ${step}`);
            }

            if (expected.expectedBlockType) {
              await RuntimeAssertions.expectCurrentBlockType(actual.stack, expected.expectedBlockType, `Step ${step}`);
            }
          }
        }

        // Validate final completion state
        const finalState = await extractRuntimeState(page);
        await RuntimeAssertions.expectWorkoutComplete(finalState, `${workout.name} completion`);

        // Take screenshot for documentation
        await demoPage.takeScreenshot(`${workout.name.toLowerCase()}-complete`);
      });
    });
  });

  test.describe('Fixed Rounds Workouts', () => {
    FIXED_ROUNDS_WORKOUTS.forEach(workout => {
      test(`${workout.name} - Complete execution`, async ({ page }) => {
        const demoPage = new JitCompilerDemoPage(page);

        // Navigate to workout
        await demoPage.gotoWorkout(workout.name);
        await demoPage.waitForRuntimeReady();

        // Execute all expected next() calls
        for (let step = 1; step <= workout.expectedNextCalls; step++) {
          await demoPage.clickNextBlock();
          await demoPage.waitForProcessingComplete();

          // Basic validation - ensure stack depth remains consistent
          const state = await extractRuntimeState(page);
          await RuntimeAssertions.expectStackDepth(state.stack, 2, `Step ${step}`); // Root + current block
        }

        // Validate final completion state
        const finalState = await extractRuntimeState(page);
        await RuntimeAssertions.expectWorkoutComplete(finalState, `${workout.name} completion`);

        // Take screenshot for documentation
        await demoPage.takeScreenshot(`${workout.name.toLowerCase()}-complete`);
      });
    });
  });

  test.describe('Time-Based Workouts', () => {
    TIME_BASED_WORKOUTS.forEach(workout => {
      test(`${workout.name} - Initial execution`, async ({ page }) => {
        const demoPage = new JitCompilerDemoPage(page);

        // Navigate to workout
        await demoPage.gotoWorkout(workout.name);
        await demoPage.waitForRuntimeReady();

        // For time-based workouts, just validate initial state and timer setup
        const initialState = await extractRuntimeState(page);

        // Validate initial stack setup
        await RuntimeAssertions.expectStackDepth(initialState.stack, 2, 'Initial state');

        // Validate timer is properly initialized
        if (workout.name === 'Cindy') {
          await WorkoutAssertions.expectCindyState(initialState, 'Cindy initial');
        } else if (workout.name === 'Chelsea') {
          await WorkoutAssertions.expectChelseaState(initialState, 1, 'Chelsea initial');
        }

        // Take screenshot for documentation
        await demoPage.takeScreenshot(`${workout.name.toLowerCase()}-initial`);
      });
    });
  });

  test.describe('Fran Detailed Validation', () => {
    test('Fran - Step by step validation', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Step 1: Initial Thrusters (21 reps)
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      let state = await extractRuntimeState(page);
      await WorkoutAssertions.expectFranState(state, 1, 'Fran Step 1');

      // Step 2: Pullups (21 reps)
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await WorkoutAssertions.expectFranState(state, 2, 'Fran Step 2');

      // Step 3: Round 2 Thrusters (15 reps)
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await WorkoutAssertions.expectFranState(state, 3, 'Fran Step 3');

      // Step 4: Round 2 Pullups (15 reps)
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await WorkoutAssertions.expectFranState(state, 4, 'Fran Step 4');

      // Step 5: Round 3 Thrusters (9 reps)
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await WorkoutAssertions.expectFranState(state, 5, 'Fran Step 5');

      // Step 6: Round 3 Pullups (9 reps)
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await WorkoutAssertions.expectFranState(state, 6, 'Fran Step 6');

      // Step 7: Completion
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await WorkoutAssertions.expectFranState(state, 7, 'Fran Step 7');
    });
  });

  test.describe('Runtime State Consistency', () => {
    test('Stack depth remains consistent during execution', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Execute through workout and validate stack depth at each step
      for (let step = 1; step <= 7; step++) {
        const state = await extractRuntimeState(page);

        if (step < 7) {
          // During execution, should have root + current block
          await RuntimeAssertions.expectStackDepth(state.stack, 2, `Step ${step} execution`);
        } else {
          // Final step should have empty stack
          await RuntimeAssertions.expectStackDepth(state.stack, 0, `Step ${step} completion`);
        }

        if (step < 7) {
          await demoPage.clickNextBlock();
          await demoPage.waitForProcessingComplete();
        }
      }
    });

    test('Memory allocation remains valid during execution', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Execute through workout and validate memory at each step
      for (let step = 1; step <= 7; step++) {
        const state = await extractRuntimeState(page);

        // All memory entries should be valid
        const invalidEntries = state.memory.entries.filter(e => !e.isValid);
        expect(invalidEntries.length, `Step ${step}: Should have no invalid memory entries`).toBe(0);

        // Should have expected memory types
        const requiredTypes = ['rounds-current', 'rounds-total'];
        for (const type of requiredTypes) {
          const entry = state.memory.entries.find(e => e.type === type);
          expect(entry, `Step ${step}: Should have ${type} memory entry`).toBeDefined();
        }

        if (step < 7) {
          await demoPage.clickNextBlock();
          await demoPage.waitForProcessingComplete();
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('Invalid workout script handling', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      // Navigate to a story and set invalid script
      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Set invalid script
      await demoPage.setScript('invalid workout script {{{');

      // Wait a bit for parsing
      await page.waitForTimeout(1000);

      // Should still be able to interact without crashing
      const state = await extractRuntimeState(page);
      await RuntimeAssertions.expectScriptValid(state, 'invalid workout script', 'Invalid script');
    });

    test('Rapid button clicks are queued', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Click rapidly multiple times
      await demoPage.clickNextBlock();
      await demoPage.clickNextBlock();
      await demoPage.clickNextBlock();

      // Wait for all to process
      await demoPage.waitForProcessingComplete();

      // Should have progressed through multiple steps
      const state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentRound(state.memory, 2, 'After rapid clicks'); // Should be at least round 2
    });
  });
});