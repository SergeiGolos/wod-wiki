import { expect } from '@playwright/test';
import { RuntimeState, RuntimeStackState, MemoryState, TimerState } from './runtime-helpers';

/**
 * Custom assertion helpers for runtime execution validation
 */

export class RuntimeAssertions {
  /**
   * Assert that the runtime stack has the expected depth
   */
  static async expectStackDepth(actual: RuntimeStackState, expectedDepth: number, context?: string) {
    const message = context ? `${context}: ` : '';
    expect(actual.depth, `${message}Stack depth should be ${expectedDepth}`).toBe(expectedDepth);
  }

  /**
   * Assert that the current block has the expected type
   */
  static async expectCurrentBlockType(actual: RuntimeStackState, expectedType: string, context?: string) {
    const message = context ? `${context}: ` : '';
    const currentBlock = actual.blocks[actual.currentIndex];

    expect(currentBlock, `${message}Current block should exist`).toBeDefined();
    expect(currentBlock?.blockType, `${message}Current block type should be ${expectedType}`).toBe(expectedType);
  }

  /**
   * Assert that the current block has the expected display name
   */
  static async expectCurrentBlockName(actual: RuntimeStackState, expectedName: string, context?: string) {
    const message = context ? `${context}: ` : '';
    const currentBlock = actual.blocks[actual.currentIndex];

    expect(currentBlock, `${message}Current block should exist`).toBeDefined();
    expect(currentBlock?.displayName, `${message}Current block name should be ${expectedName}`).toBe(expectedName);
  }

  /**
   * Assert that the current round matches expected value
   */
  static async expectCurrentRound(actual: MemoryState, expectedRound: number, context?: string) {
    const message = context ? `${context}: ` : '';
    const roundsEntry = actual.entries.find(entry => entry.type === 'rounds-current');

    expect(roundsEntry, `${message}Rounds current entry should exist`).toBeDefined();
    expect(roundsEntry?.value, `${message}Current round should be ${expectedRound}`).toBe(expectedRound);
  }

  /**
   * Assert that the total rounds matches expected value
   */
  static async expectTotalRounds(actual: MemoryState, expectedTotal: number, context?: string) {
    const message = context ? `${context}: ` : '';
    const totalEntry = actual.entries.find(entry => entry.type === 'rounds-total');

    expect(totalEntry, `${message}Rounds total entry should exist`).toBeDefined();
    expect(totalEntry?.value, `${message}Total rounds should be ${expectedTotal}`).toBe(expectedTotal);
  }

  /**
   * Assert that the current reps match expected value
   */
  static async expectCurrentReps(actual: RuntimeStackState, expectedReps: number, context?: string) {
    const message = context ? `${context}: ` : '';
    const currentBlock = actual.blocks[actual.currentIndex];

    expect(currentBlock, `${message}Current block should exist`).toBeDefined();

    const repsMetric = currentBlock?.metrics.find(m => m.type === 'reps');
    expect(repsMetric, `${message}Reps metric should exist`).toBeDefined();
    expect(repsMetric?.value, `${message}Current reps should be ${expectedReps}`).toBe(expectedReps);
  }

  /**
   * Assert that a specific memory entry exists with expected value
   */
  static async expectMemoryEntry(actual: MemoryState, type: string, expectedValue: any, ownerId?: string, context?: string) {
    const message = context ? `${context}: ` : '';
    const entry = actual.entries.find(e =>
      e.type === type && (!ownerId || e.ownerId === ownerId)
    );

    expect(entry, `${message}Memory entry should exist: type=${type}, owner=${ownerId}`).toBeDefined();
    expect(entry?.value, `${message}Memory entry value should be ${expectedValue}`).toBe(expectedValue);
  }

  /**
   * Assert that workout is complete
   */
  static async expectWorkoutComplete(actual: RuntimeState, context?: string) {
    const message = context ? `${context}: ` : '';

    // Stack should be empty
    expect(actual.stack.depth, `${message}Stack should be empty for completed workout`).toBe(0);

    // Completion status should be true
    const completionEntry = actual.memory.entries.find(e => e.type === 'completion-status');
    expect(completionEntry, `${message}Completion status entry should exist`).toBeDefined();
    expect(completionEntry?.value, `${message}Completion status should be true`).toBe(true);
  }

  /**
   * Assert that timer is in expected state
   */
  static async expectTimerState(actual: TimerState | undefined, expected: Partial<TimerState>, context?: string) {
    const message = context ? `${context}: ` : '';

    expect(actual, `${message}Timer state should exist`).toBeDefined();

    if (expected.isRunning !== undefined) {
      expect(actual?.isRunning, `${message}Timer running state should be ${expected.isRunning}`).toBe(expected.isRunning);
    }

    if (expected.elapsedMs !== undefined) {
      expect(actual?.elapsedMs, `${message}Timer elapsed should be ${expected.elapsedMs}`).toBe(expected.elapsedMs);
    }

    if (expected.totalMs !== undefined) {
      expect(actual?.totalMs, `${message}Timer total should be ${expected.totalMs}`).toBe(expected.totalMs);
    }
  }

  /**
   * Assert that a specific metric exists on the current block
   */
  static async expectBlockMetric(actual: RuntimeStackState, metricType: string, expectedValue: any, context?: string) {
    const message = context ? `${context}: ` : '';
    const currentBlock = actual.blocks[actual.currentIndex];

    expect(currentBlock, `${message}Current block should exist`).toBeDefined();

    const metric = currentBlock?.metrics.find(m => m.type === metricType);
    expect(metric, `${message}Metric ${metricType} should exist`).toBeDefined();
    expect(metric?.value, `${message}Metric ${metricType} should be ${expectedValue}`).toBe(expectedValue);
  }

  /**
   * Assert that memory contains expected number of entries by type
   */
  static async expectMemoryCountByType(actual: MemoryState, type: string, expectedCount: number, context?: string) {
    const message = context ? `${context}: ` : '';
    const count = actual.summary.byType[type] || 0;

    expect(count, `${message}Memory entries of type ${type} should be ${expectedCount}`).toBe(expectedCount);
  }

  /**
   * Assert that memory contains expected number of entries by owner
   */
  static async expectMemoryCountByOwner(actual: MemoryState, ownerId: string, expectedCount: number, context?: string) {
    const message = context ? `${context}: ` : '';
    const count = actual.summary.byOwner[ownerId] || 0;

    expect(count, `${message}Memory entries for owner ${ownerId} should be ${expectedCount}`).toBe(expectedCount);
  }

  /**
   * Assert that script is valid and contains expected content
   */
  static async expectScriptValid(actual: RuntimeState, expectedContent?: string, context?: string) {
    const message = context ? `${context}: ` : '';

    expect(actual.script.isValid, `${message}Script should be valid`).toBe(true);

    if (expectedContent) {
      expect(actual.script.content, `${message}Script content should match`).toContain(expectedContent);
    }
  }

  /**
   * Assert that parsed fragments exist and have expected count
   */
  static async expectParsedFragments(actual: RuntimeState, expectedCount: number, context?: string) {
    const message = context ? `${context}: ` : '';

    expect(actual.script.parsedFragments.length, `${message}Should have ${expectedCount} parsed fragments`).toBe(expectedCount);
  }
}

/**
 * Workout-specific assertion helpers
 */
export class WorkoutAssertions {
  /**
   * Assert Fran workout state at specific step
   */
  static async expectFranState(actual: RuntimeState, step: number, context?: string) {
    const message = context ? `${context}: ` : '';

    switch (step) {
      case 1:
        await RuntimeAssertions.expectStackDepth(actual.stack, 2, `${message}Step 1`);
        await RuntimeAssertions.expectCurrentRound(actual.memory, 1, `${message}Step 1`);
        await RuntimeAssertions.expectCurrentReps(actual.stack, 21, `${message}Step 1`);
        break;
      case 2:
        await RuntimeAssertions.expectStackDepth(actual.stack, 2, `${message}Step 2`);
        await RuntimeAssertions.expectCurrentRound(actual.memory, 1, `${message}Step 2`);
        await RuntimeAssertions.expectCurrentReps(actual.stack, 21, `${message}Step 2`);
        break;
      case 3:
        await RuntimeAssertions.expectStackDepth(actual.stack, 2, `${message}Step 3`);
        await RuntimeAssertions.expectCurrentRound(actual.memory, 2, `${message}Step 3`);
        await RuntimeAssertions.expectCurrentReps(actual.stack, 15, `${message}Step 3`);
        break;
      case 4:
        await RuntimeAssertions.expectStackDepth(actual.stack, 2, `${message}Step 4`);
        await RuntimeAssertions.expectCurrentRound(actual.memory, 2, `${message}Step 4`);
        await RuntimeAssertions.expectCurrentReps(actual.stack, 15, `${message}Step 4`);
        break;
      case 5:
        await RuntimeAssertions.expectStackDepth(actual.stack, 2, `${message}Step 5`);
        await RuntimeAssertions.expectCurrentRound(actual.memory, 3, `${message}Step 5`);
        await RuntimeAssertions.expectCurrentReps(actual.stack, 9, `${message}Step 5`);
        break;
      case 6:
        await RuntimeAssertions.expectStackDepth(actual.stack, 2, `${message}Step 6`);
        await RuntimeAssertions.expectCurrentRound(actual.memory, 3, `${message}Step 6`);
        await RuntimeAssertions.expectCurrentReps(actual.stack, 9, `${message}Step 6`);
        break;
      case 7:
        await RuntimeAssertions.expectWorkoutComplete(actual, `${message}Step 7`);
        break;
      default:
        throw new Error(`Invalid Fran step: ${step}`);
    }
  }

  /**
   * Assert Barbara workout state at specific step
   */
  static async expectBarbaraState(actual: RuntimeState, step: number, context?: string) {
    const message = context ? `${context}: ` : '';

    // Barbara has 5 rounds with 4 exercises each (20 total steps)
    const round = Math.floor((step - 1) / 4) + 1;
    const exerciseInRound = ((step - 1) % 4) + 1;

    await RuntimeAssertions.expectStackDepth(actual.stack, 2, `${message}Step ${step}`);
    await RuntimeAssertions.expectCurrentRound(actual.memory, round, `${message}Step ${step}`);

    // Barbara doesn't have variable reps, so no reps assertion
  }

  /**
   * Assert Cindy workout state (time-based)
   */
  static async expectCindyState(actual: RuntimeState, context?: string) {
    const message = context ? `${context}: ` : '';

    await RuntimeAssertions.expectStackDepth(actual.stack, 2, message);
    await RuntimeAssertions.expectTimerState(actual.timer, { isRunning: true }, message);
    await RuntimeAssertions.expectTotalRounds(actual.memory, 0, message); // AMRAP has no fixed rounds
  }

  /**
   * Assert Chelsea workout state (EMOM)
   */
  static async expectChelseaState(actual: RuntimeState, round: number, context?: string) {
    const message = context ? `${context}: ` : '';

    await RuntimeAssertions.expectStackDepth(actual.stack, 2, message);
    await RuntimeAssertions.expectCurrentRound(actual.memory, round, message);
    await RuntimeAssertions.expectTotalRounds(actual.memory, 30, message);
  }
}

/**
 * Error handling assertions
 */
export class ErrorAssertions {
  /**
   * Assert that no runtime errors occurred
   */
  static async expectNoRuntimeErrors(actual: RuntimeState, context?: string) {
    const message = context ? `${context}: ` : '';

    // Check for error memory entries
    const errorEntries = actual.memory.entries.filter(e => e.type.includes('error'));
    expect(errorEntries.length, `${message}Should have no error entries`).toBe(0);
  }

  /**
   * Assert that a specific error occurred
   */
  static async expectRuntimeError(actual: RuntimeState, errorType: string, context?: string) {
    const message = context ? `${context}: ` : '';

    const errorEntry = actual.memory.entries.find(e => e.type === errorType);
    expect(errorEntry, `${message}Error entry should exist: ${errorType}`).toBeDefined();
  }
}
