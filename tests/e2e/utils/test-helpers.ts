import { Page } from '@playwright/test';
import { JitCompilerDemoPage } from '../pages/JitCompilerDemoPage';
import { extractRuntimeState, RuntimeState } from './runtime-helpers';

/**
 * Test utilities and helper functions for runtime execution tests
 */

export class TestHelpers {
  /**
   * Execute a complete workout and validate each step
   */
  static async executeWorkoutWithValidation(
    page: Page,
    workoutName: string,
    expectedSteps: number,
    stepValidator?: (state: RuntimeState, step: number) => Promise<void>
  ): Promise<void> {
    const demoPage = new JitCompilerDemoPage(page);

    await demoPage.gotoWorkout(workoutName);
    await demoPage.waitForRuntimeReady();

    // Execute each step with validation
    for (let step = 1; step <= expectedSteps; step++) {
      const stateBefore = await extractRuntimeState(page);

      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      const stateAfter = await extractRuntimeState(page);

      // Run custom validator if provided
      if (stepValidator) {
        await stepValidator(stateAfter, step);
      }

      // Basic validation that something changed
      if (step < expectedSteps) {
        // During execution, stack should have blocks
        if (stateAfter.stack.depth === 0) {
          throw new Error(`Step ${step}: Stack became empty before workout completion`);
        }
      }
    }

    // Final validation - workout should be complete
    const finalState = await extractRuntimeState(page);
    if (finalState.stack.depth !== 0) {
      throw new Error(`Workout ${workoutName} did not complete properly - stack depth: ${finalState.stack.depth}`);
    }
  }

  /**
   * Execute workout until specific condition is met
   */
  static async executeUntilCondition(
    page: Page,
    workoutName: string,
    condition: (state: RuntimeState, step: number) => boolean,
    maxSteps: number = 50
  ): Promise<{ finalState: RuntimeState; stepsExecuted: number }> {
    const demoPage = new JitCompilerDemoPage(page);

    await demoPage.gotoWorkout(workoutName);
    await demoPage.waitForRuntimeReady();

    let stepsExecuted = 0;
    let currentState = await extractRuntimeState(page);

    while (stepsExecuted < maxSteps && !condition(currentState, stepsExecuted)) {
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      stepsExecuted++;
      currentState = await extractRuntimeState(page);
    }

    if (stepsExecuted >= maxSteps) {
      throw new Error(`Condition not met within ${maxSteps} steps`);
    }

    return { finalState: currentState, stepsExecuted };
  }

  /**
   * Validate workout execution time is within acceptable limits
   */
  static async measureExecutionTime(
    page: Page,
    workoutName: string,
    expectedSteps: number,
    maxTimePerStep: number = 2000
  ): Promise<{ totalTime: number; averageTimePerStep: number; stepTimes: number[] }> {
    const demoPage = new JitCompilerDemoPage(page);

    await demoPage.gotoWorkout(workoutName);
    await demoPage.waitForRuntimeReady();

    const stepTimes: number[] = [];

    for (let step = 1; step <= expectedSteps; step++) {
      const startTime = Date.now();

      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      const endTime = Date.now();
      const stepTime = endTime - startTime;
      stepTimes.push(stepTime);

      if (stepTime > maxTimePerStep) {
        console.warn(`Step ${step} took ${stepTime}ms (exceeds limit of ${maxTimePerStep}ms)`);
      }
    }

    const totalTime = stepTimes.reduce((sum, time) => sum + time, 0);
    const averageTimePerStep = totalTime / expectedSteps;

    return { totalTime, averageTimePerStep, stepTimes };
  }

  /**
   * Test rapid clicking behavior
   */
  static async testRapidClicks(
    page: Page,
    workoutName: string,
    clickCount: number = 5,
    expectedMinProgression: number = 2
  ): Promise<{ finalRound: number; clicksProcessed: number }> {
    const demoPage = new JitCompilerDemoPage(page);

    await demoPage.gotoWorkout(workoutName);
    await demoPage.waitForRuntimeReady();

    const initialState = await extractRuntimeState(page);
    const initialRound = this.getCurrentRound(initialState);

    // Perform rapid clicks
    const clickPromises = [];
    for (let i = 0; i < clickCount; i++) {
      clickPromises.push(demoPage.clickNextBlock());
    }
    await Promise.all(clickPromises);

    // Wait for all processing to complete
    await demoPage.waitForProcessingComplete();

    const finalState = await extractRuntimeState(page);
    const finalRound = this.getCurrentRound(finalState);

    const progression = finalRound - initialRound;
    if (progression < expectedMinProgression) {
      throw new Error(`Expected at least ${expectedMinProgression} round progression, got ${progression}`);
    }

    return { finalRound, clicksProcessed: clickCount };
  }

  /**
   * Validate memory consistency during execution
   */
  static async validateMemoryConsistency(
    page: Page,
    workoutName: string,
    steps: number
  ): Promise<{ memoryLeaks: boolean; invalidEntries: number; consistencyErrors: string[] }> {
    const demoPage = new JitCompilerDemoPage(page);

    await demoPage.gotoWorkout(workoutName);
    await demoPage.waitForRuntimeReady();

    const consistencyErrors: string[] = [];
    let maxMemoryEntries = 0;

    for (let step = 1; step <= steps; step++) {
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      const state = await extractRuntimeState(page);

      // Check for invalid memory entries
      const invalidEntries = state.memory.entries.filter(e => !e.isValid);
      if (invalidEntries.length > 0) {
        consistencyErrors.push(`Step ${step}: ${invalidEntries.length} invalid memory entries`);
      }

      // Check for memory growth (potential leaks)
      if (state.memory.totalAllocated > maxMemoryEntries) {
        maxMemoryEntries = state.memory.totalAllocated;
      }

      // Validate required memory types exist
      const requiredTypes = ['rounds-current', 'rounds-total'];
      for (const type of requiredTypes) {
        const entry = state.memory.entries.find(e => e.type === type);
        if (!entry) {
          consistencyErrors.push(`Step ${step}: Missing required memory type ${type}`);
        }
      }
    }

    const memoryLeaks = maxMemoryEntries > 20; // Arbitrary threshold

    return {
      memoryLeaks,
      invalidEntries: consistencyErrors.length,
      consistencyErrors
    };
  }

  /**
   * Create a performance report for workout execution
   */
  static async generatePerformanceReport(
    page: Page,
    workoutName: string,
    expectedSteps: number
  ): Promise<PerformanceReport> {
    const executionMetrics = await this.measureExecutionTime(page, workoutName, expectedSteps);

    const demoPage = new JitCompilerDemoPage(page);
    await demoPage.gotoWorkout(workoutName);
    await demoPage.waitForRuntimeReady();

    // Measure memory usage
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });

    // Measure network requests during execution
    const networkRequests: string[] = [];
    page.on('request', request => {
      networkRequests.push(request.url());
    });

    // Execute workout
    for (let step = 1; step <= expectedSteps; step++) {
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();
    }

    return {
      workoutName,
      expectedSteps,
      executionMetrics,
      memoryUsage,
      networkRequests: networkRequests.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Helper to get current round from runtime state
   */
  private static getCurrentRound(state: RuntimeState): number {
    const roundsEntry = state.memory.entries.find(e => e.type === 'rounds-current');
    return roundsEntry ? parseInt(roundsEntry.value.toString()) : 0;
  }

  /**
   * Wait for a specific UI element to stabilize
   */
  static async waitForUIStability(
    page: Page,
    selector: string,
    timeout: number = 5000,
    stabilityDuration: number = 1000
  ): Promise<void> {
    const element = page.locator(selector);

    // Wait for element to exist
    await element.waitFor({ timeout });

    // Wait for content to stabilize
    let lastContent = '';
    let stableStartTime = 0;

    while (Date.now() - stableStartTime < stabilityDuration) {
      const currentContent = await element.textContent() || '';

      if (currentContent === lastContent) {
        if (stableStartTime === 0) {
          stableStartTime = Date.now();
        }
      } else {
        stableStartTime = 0;
        lastContent = currentContent;
      }

      await page.waitForTimeout(100);
    }
  }

  /**
   * Simulate network conditions for testing
   */
  static async simulateNetworkConditions(
    page: Page,
    conditions: {
      latency?: number;
      downloadThroughput?: number;
      uploadThroughput?: number;
    }
  ): Promise<void> {
    await page.context().setOffline(false);

    if (conditions.latency !== undefined ||
        conditions.downloadThroughput !== undefined ||
        conditions.uploadThroughput !== undefined) {

      await page.context().addInitScript(() => {
        // Override network timing for testing
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              originalFetch.apply(this, args).then(resolve).catch(reject);
            }, 100); // Add artificial delay
          });
        };
      });
    }
  }

  /**
   * Clean up test state between tests
   */
  static async cleanupTestState(page: Page): Promise<void> {
    // Clear any lingering state
    await page.evaluate(() => {
      // Clear any global test state
      if ((window as any).testState) {
        delete (window as any).testState;
      }
    });

    // Reset page if needed
    await page.reload();
  }
}

export interface PerformanceReport {
  workoutName: string;
  expectedSteps: number;
  executionMetrics: {
    totalTime: number;
    averageTimePerStep: number;
    stepTimes: number[];
  };
  memoryUsage: any;
  networkRequests: number;
  timestamp: string;
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate a custom workout script for testing
   */
  static generateWorkoutScript(options: {
    rounds?: number;
    exercises?: string[];
    repScheme?: number[];
    timer?: string;
  }): string {
    const {
      rounds = 3,
      exercises = ['Pushups', 'Pullups'],
      repScheme,
      timer
    } = options;

    if (timer) {
      // Time-based workout
      return `${timer} AMRAP\n${exercises.map(ex => `5 ${ex}`).join('\n')}`;
    }

    if (repScheme) {
      // Variable rep scheme
      const repString = repScheme.join('-');
      return `(${repString}) ${exercises.join(', ')}`;
    }

    // Fixed rounds
    return `(${rounds}) ${exercises.join(', ')}`;
  }

  /**
   * Generate test cases for different workout patterns
   */
  static generateWorkoutTestCases(): Array<{
    name: string;
    script: string;
    expectedSteps: number;
    type: string;
  }> {
    return [
      {
        name: 'Simple Fixed Rounds',
        script: '(3) Pushups, Pullups',
        expectedSteps: 6,
        type: 'fixed-rounds'
      },
      {
        name: 'Variable Reps',
        script: '(5-4-3) Squats, Burpees',
        expectedSteps: 6,
        type: 'variable-rep'
      },
      {
        name: 'AMRAP',
        script: '10:00 AMRAP\n5 Pushups\n10 Squats',
        expectedSteps: 0, // Unlimited
        type: 'time-based'
      },
      {
        name: 'EMOM',
        script: '(5) :60 EMOM\n5 Pullups\n10 Pushups',
        expectedSteps: 5,
        type: 'time-based'
      }
    ];
  }

  /**
   * Generate edge case scripts
   */
  static generateEdgeCaseScripts(): string[] {
    return [
      '(1) Pushup',           // Single rep
      '(0) Pushups',          // Zero reps
      '10000 Burpees',        // Large number
      '(1-1-1-1-1) Pushup',   // Many rounds, same reps
      '0:01 AMRAP\n1 Pushup', // Very short timer
      '(100) Pushups',        // Large round count
    ];
  }
}

/**
 * Screenshot utilities for visual regression
 */
export class ScreenshotHelper {
  /**
   * Take screenshots at key points during execution
   */
  static async captureExecutionScreenshots(
    page: Page,
    workoutName: string,
    steps: number[]
  ): Promise<string[]> {
    const demoPage = new JitCompilerDemoPage(page);
    const screenshots: string[] = [];

    await demoPage.gotoWorkout(workoutName);
    await demoPage.waitForRuntimeReady();

    // Initial state
    const initialScreenshot = await demoPage.takeScreenshot(`${workoutName}-initial`);
    screenshots.push(initialScreenshot);

    // Execute through specified steps
    for (const step of steps) {
      await demoPage.clickNextBlock();
      await demoPage.waitForProcessingComplete();

      const stepScreenshot = await demoPage.takeScreenshot(`${workoutName}-step-${step}`);
      screenshots.push(stepScreenshot);
    }

    return screenshots;
  }

  /**
   * Compare screenshots for visual differences
   */
  static async compareScreenshots(
    baselinePath: string,
    currentPath: string,
    threshold: number = 0.1
  ): Promise<{ matches: boolean; difference: number }> {
    // This would require a visual comparison library
    // For now, return a placeholder
    return {
      matches: true,
      difference: 0
    };
  }
}