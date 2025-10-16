import { test } from '@playwright/test';
import { JitCompilerDemoPage } from '../pages/JitCompilerDemoPage';
import { extractRuntimeState, waitForRuntimeState } from '../utils/runtime-helpers';
import { RuntimeAssertions, WorkoutAssertions } from '../utils/assertion-helpers';

/**
 * State transition tests
 * Validates how runtime state changes between execution steps
 */

test.describe('Runtime State Transitions', () => {
  test.describe('Round Transitions', () => {
    test('Fran round transitions', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Initial state validation
      let state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentRound(state.memory, 1, 'Initial round');
      await RuntimeAssertions.expectTotalRounds(state.memory, 3, 'Total rounds');

      // Round 1: Thrusters (21) -> Pullups (21)
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentRound(state.memory, 1, 'Round 1 Thrusters');
      await RuntimeAssertions.expectCurrentReps(state.stack, 21, 'Round 1 Thrusters');

      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentRound(state.memory, 1, 'Round 1 Pullups');
      await RuntimeAssertions.expectCurrentReps(state.stack, 21, 'Round 1 Pullups');

      // Transition to Round 2: Thrusters (15)
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentRound(state.memory, 2, 'Round 2 Thrusters');
      await RuntimeAssertions.expectCurrentReps(state.stack, 15, 'Round 2 Thrusters');

      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentRound(state.memory, 2, 'Round 2 Pullups');
      await RuntimeAssertions.expectCurrentReps(state.stack, 15, 'Round 2 Pullups');

      // Transition to Round 3: Thrusters (9)
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentRound(state.memory, 3, 'Round 3 Thrusters');
      await RuntimeAssertions.expectCurrentReps(state.stack, 9, 'Round 3 Thrusters');

      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentRound(state.memory, 3, 'Round 3 Pullups');
      await RuntimeAssertions.expectCurrentReps(state.stack, 9, 'Round 3 Pullups');

      // Completion
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectWorkoutComplete(state, 'Fran completion');
    });

    test('Barbara round transitions', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Barbara');
      await demoPage.waitForRuntimeReady();

      // Barbara has 5 rounds with 4 exercises each
      for (let round = 1; round <= 5; round++) {
        // Validate round start
        let state = await extractRuntimeState(page);
        await RuntimeAssertions.expectCurrentRound(state.memory, round, `Round ${round} start`);

        // Execute 4 exercises in this round
        for (let exercise = 1; exercise <= 4; exercise++) {
          await demoPage.clickNextBlock();
          await demoPage.waitForProcessingComplete();

          state = await extractRuntimeState(page);
          await RuntimeAssertions.expectCurrentRound(state.memory, round, `Round ${round} exercise ${exercise}`);
          await RuntimeAssertions.expectStackDepth(state.stack, 2, `Round ${round} exercise ${exercise}`);
        }
      }

      // Completion
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      const finalState = await extractRuntimeState(page);
      await RuntimeAssertions.expectWorkoutComplete(finalState, 'Barbara completion');
    });
  });

  test.describe('Child Block Transitions', () => {
    test('Thrusters to Pullups transition', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Start first exercise (Thrusters)
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      let state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentBlockName(state.stack, 'Thrusters', 'First exercise');
      await RuntimeAssertions.expectCurrentReps(state.stack, 21, 'Thrusters reps');

      // Transition to second exercise (Pullups)
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
      state = await extractRuntimeState(page);
      await RuntimeAssertions.expectCurrentBlockName(state.stack, 'Pullups', 'Second exercise');
      await RuntimeAssertions.expectCurrentReps(state.stack, 21, 'Pullups reps');
    });

    test('Barbara exercise sequence', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Barbara');
      await demoPage.waitForRuntimeReady();

      const exerciseSequence = ['Pullups', 'Pushups', 'Situps', 'Air Squats'];

      // Test first round exercise sequence
      for (let i = 0; i < exerciseSequence.length; i++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);
        await RuntimeAssertions.expectCurrentBlockName(state.stack, exerciseSequence[i], `Exercise ${i + 1}`);
        await RuntimeAssertions.expectCurrentRound(state.memory, 1, `Exercise ${i + 1}`);
      }
    });
  });

  test.describe('Memory State Transitions', () => {
    test('Round counter increments correctly', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Track round progression
      const expectedRounds = [1, 1, 2, 2, 3, 3];

      for (let step = 0; step < expectedRounds.length; step++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);
        await RuntimeAssertions.expectCurrentRound(state.memory, expectedRounds[step], `Step ${step + 1}`);
      }
    });

    test('Memory entries persist correctly', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Execute a few steps
      for (let step = 1; step <= 3; step++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);

        // Validate key memory entries exist and are valid
        await RuntimeAssertions.expectMemoryEntry(state.memory, 'rounds-current', step <= 2 ? 1 : 2, undefined, `Step ${step}`);
        await RuntimeAssertions.expectMemoryEntry(state.memory, 'rounds-total', 3, undefined, `Step ${step}`);

        // Validate memory counts
        await RuntimeAssertions.expectMemoryCountByType(state.memory, 'rounds-current', 1, `Step ${step}`);
        await RuntimeAssertions.expectMemoryCountByType(state.memory, 'rounds-total', 1, `Step ${step}`);
      }
    });

    test('Completion status transitions', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Execute through to completion
      for (let step = 1; step <= 7; step++) {
        if (step < 7) {
          await demoPage.clickNextBlock();
          await demoPage.waitForProcessingComplete();
        }

        const state = await extractRuntimeState(page);

        if (step < 7) {
          // During execution, completion should not be set or should be false
          const completionEntry = state.memory.entries.find(e => e.type === 'completion-status');
          if (completionEntry) {
            test.expect(completionEntry.value).toBe(false);
          }
        } else {
          // Final step - trigger completion
          await demoPage.clickNextBlock();
          await demoPage.waitForProcessingComplete();

          const finalState = await extractRuntimeState(page);
          await RuntimeAssertions.expectWorkoutComplete(finalState, 'Final completion');
        }
      }
    });
  });

  test.describe('Stack State Transitions', () => {
    test('Stack maintains consistent structure', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      // Execute through workout
      for (let step = 1; step <= 7; step++) {
        const state = await extractRuntimeState(page);

        if (step < 7) {
          // During execution: root block + current exercise block
          test.expect(state.stack.depth).toBe(2);
          test.expect(state.stack.blocks.length).toBe(2);
          test.expect(state.stack.currentIndex).toBe(1); // Current block is active
        } else {
          // Completion: empty stack
          test.expect(state.stack.depth).toBe(0);
          test.expect(state.stack.blocks.length).toBe(0);
        }

        if (step < 7) {
          await demoPage.clickNextBlock();
          await demoPage.waitForProcessingComplete();
        }
      }
    });

    test('Block types transition correctly', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Fran');
      await demoPage.waitForRuntimeReady();

      const expectedSequence = [
        'Effort', // Thrusters
        'Effort', // Pullups
        'Effort', // Thrusters round 2
        'Effort', // Pullups round 2
        'Effort', // Thrusters round 3
        'Effort'  // Pullups round 3
      ];

      for (let step = 0; step < expectedSequence.length; step++) {
        await demoPage.clickNextBlock();
        await demoPage.waitForProcessingComplete();

        const state = await extractRuntimeState(page);
        await RuntimeAssertions.expectCurrentBlockType(state.stack, expectedSequence[step], `Step ${step + 1}`);
      }
    });
  });

  test.describe('Timer State Transitions', () => {
    test('Time-based workout timer initialization', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Cindy');
      await demoPage.waitForRuntimeReady();

      const state = await extractRuntimeState(page);

      // Cindy should have timer initialized
      test.expect(state.timer).toBeDefined();
      test.expect(state.timer?.isRunning).toBe(true);
      test.expect(state.timer?.totalMs).toBe(1200000); // 20 minutes
      test.expect(state.timer?.elapsedMs).toBeGreaterThanOrEqual(0);
    });

    test('EMOM timer transitions', async ({ page }) => {
      const demoPage = new JitCompilerDemoPage(page);

      await demoPage.gotoWorkout('Chelsea');
      await demoPage.waitForRuntimeReady();

      // Execute first interval
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      const state = await extractRuntimeState(page);
      await WorkoutAssertions.expectChelseaState(state, 1, 'Chelsea first interval');

      // Timer should reset every minute in EMOM
      test.expect(state.timer).toBeDefined();
      test.expect(state.timer?.totalMs).toBe(60000); // 1 minute intervals
    });
  });
});