import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WorkoutTestHarness, WorkoutTestBuilder } from '@/testing/harness/WorkoutTestHarness';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

/**
 * Grace - Single Exercise For Time
 * 
 * Stack Expectations:
 * - mount() → pushes single rep block (30 Clean & Jerks)
 * - Block tracks rep completion internally
 * - complete() → pops block when 30 reps done
 * 
 * Report Expectations:
 * - Total time to complete 30 reps
 * - Average time per rep
 */
describe('Grace (Single Exercise For Time)', () => {
  let harness: WorkoutTestHarness;

  beforeEach(() => {
    harness = new WorkoutTestBuilder()
      .withScript(`30 Clean & Jerk 135lb`)
      .withStrategy(new EffortFallbackStrategy())
      .build();
  });

  afterEach(() => {
    harness?.dispose();
  });

  it('should push single rep block on mount', () => {
    harness.mount();
    
    expect(harness.stackDepth).toBeGreaterThanOrEqual(1);
    expect(harness.currentBlock?.label).toContain('Clean & Jerk');
  });

  it('should track total time to completion', () => {
    harness.mount();
    
    // Simulate completing the workout in 2 minutes
    harness.advanceClock(2 * 60 * 1000);
    harness.next(); // Complete the exercise
    
    const report = harness.getReport();
    expect(report.elapsedTime).toBe(2 * 60 * 1000);
  });

  it('should track total reps', () => {
    harness.mount();
    
    harness.next(); // Complete 30 Clean & Jerks
    
    const report = harness.getReport();
    expect(report.totalReps['Clean & Jerk 135lb']).toBe(30);
  });

  it('should complete after single exercise set', () => {
    harness.mount();
    
    harness.next(); // Complete the exercise
    
    expect(harness.isComplete()).toBe(true);
  });

  it('should allow early completion (scaled/DNF)', () => {
    harness.mount();
    
    // User stops after 1 minute (didn't finish all 30)
    harness.advanceClock(60 * 1000);
    harness.complete();
    
    expect(harness.isComplete()).toBe(true);
    expect(harness.getReport().elapsedTime).toBe(60 * 1000);
  });

  it('should collect fragments from the block', () => {
    harness.mount();
    
    harness.next();
    
    const report = harness.getReport();
    expect(report.fragments.length).toBeGreaterThan(0);
  });
});
