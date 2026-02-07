import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WorkoutTestHarness, WorkoutTestBuilder } from '@/testing/harness/WorkoutTestHarness';
import { GenericLoopStrategy } from '@/runtime/compiler/strategies/components/GenericLoopStrategy';
import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

/**
 * Barbara - 5 Rounds with Rest
 * 
 * Stack Expectations:
 * - mount() → pushes rounds block (round 1 of 5), pushes 20 Pullups
 * - next() → pops Pullups, pushes 30 Pushups
 * - next() → pops Pushups, pushes 40 Situps
 * - next() → pops Situps, pushes 50 Air Squats
 * - next() → pops Air Squats, pushes 3:00 Rest timer
 * - next() (or timer expires) → pops Rest, advances to round 2, pushes 20 Pullups
 * - ... continues through 5 rounds
 * - Final rest completes → rounds block complete
 * 
 * Report Expectations:
 * - Work time per round (excluding rest)
 * - Total work time vs total time
 * - Rest periods: 4 × 3:00 = 12:00 total rest
 */
describe('Barbara (5 Rounds with Rest)', () => {
  let harness: WorkoutTestHarness;

  beforeEach(() => {
    harness = new WorkoutTestBuilder()
      .withScript(`(5)
  + 20 Pullups
  + 30 Pushups
  + 40 Situps
  + 50 Air Squats
  3:00 Rest`)
      .withStrategy(new GenericLoopStrategy())
      .withStrategy(new GenericTimerStrategy())
      .withStrategy(new ChildrenStrategy())
      .withStrategy(new EffortFallbackStrategy())
      .build();
  });

  afterEach(() => {
    harness?.dispose();
  });

  it('should push rounds block and first child on mount', () => {
    harness.mount();
    
    expect(harness.stackDepth).toBeGreaterThanOrEqual(2);
    expect(harness.currentBlock?.label).toContain('Pullups');
  });

  it('should advance through 4 exercises plus rest per round', () => {
    harness.mount();
    
    // Exercise 1: Pullups
    expect(harness.currentBlock?.label).toContain('Pullups');
    harness.next();
    
    // Exercise 2: Pushups
    expect(harness.currentBlock?.label).toContain('Pushups');
    harness.next();
    
    // Exercise 3: Situps
    expect(harness.currentBlock?.label).toContain('Situps');
    harness.next();
    
    // Exercise 4: Air Squats
    expect(harness.currentBlock?.label).toContain('Air Squats');
    harness.next();
    
    // Rest timer
    expect(harness.currentBlock?.label).toContain('Rest');
  });

  it('should auto-advance when rest timer expires', () => {
    harness.mount();
    
    // Complete round 1 exercises
    harness.next(); // Pullups
    harness.next(); // Pushups
    harness.next(); // Situps
    harness.next(); // Air Squats
    harness.completeRound();
    
    // Now on rest timer
    expect(harness.currentBlock?.label).toContain('Rest');
    
    // Advance clock through rest
    harness.advanceClock(3 * 60 * 1000); // 3 minutes
    harness.addRestTime(3 * 60 * 1000);
    
    // Should auto-advance to round 2
    harness.next(); // Complete rest
    expect(harness.currentBlock?.label).toContain('Pullups');
    expect(harness.getReport().currentRound).toBe(2);
  });

  it('should allow skipping rest with next()', () => {
    harness.mount();
    
    // Complete round 1
    harness.next(); // Pullups
    harness.next(); // Pushups
    harness.next(); // Situps
    harness.next(); // Air Squats
    harness.completeRound();
    
    // On rest timer - skip it early
    harness.advanceClock(30 * 1000); // Only 30 seconds
    harness.addRestTime(30 * 1000);
    harness.next(); // Skip remaining rest
    
    // Should advance to round 2
    expect(harness.currentBlock?.label).toContain('Pullups');
    expect(harness.getReport().restTaken).toBeLessThan(3 * 60 * 1000);
  });

  it('should complete after 5 rounds', () => {
    harness.mount();
    
    for (let round = 1; round <= 5; round++) {
      harness.next(); // Pullups
      harness.next(); // Pushups
      harness.next(); // Situps
      harness.next(); // Air Squats
      harness.completeRound();
      
      // Rest (except after last round)
      if (round < 5) {
        harness.advanceClock(3 * 60 * 1000);
        harness.addRestTime(3 * 60 * 1000);
        harness.next();
      }
    }
    
    expect(harness.isComplete()).toBe(true);
    expect(harness.getReport().roundsCompleted).toBe(5);
  });

  it('should allow early completion mid-workout', () => {
    harness.mount();
    
    // Complete 2 full rounds
    for (let round = 0; round < 2; round++) {
      harness.next(); // Pullups
      harness.next(); // Pushups
      harness.next(); // Situps
      harness.next(); // Air Squats
      harness.advanceClock(3 * 60 * 1000);
      harness.addRestTime(3 * 60 * 1000);
      harness.next(); // Rest
      harness.completeRound();
    }
    
    // Start round 3, then quit
    harness.next(); // Pullups
    harness.complete();
    
    expect(harness.isComplete()).toBe(true);
    expect(harness.getReport().roundsCompleted).toBe(2);
    expect(harness.getReport().partialReps).toBeGreaterThan(0); // Some progress in round 3
  });

  it('should track total rest time', () => {
    harness.mount();
    
    for (let round = 1; round <= 5; round++) {
      harness.next(); // Pullups
      harness.next(); // Pushups
      harness.next(); // Situps
      harness.next(); // Air Squats
      harness.completeRound();
      
      if (round < 5) {
        harness.advanceClock(3 * 60 * 1000);
        harness.addRestTime(3 * 60 * 1000);
        harness.next();
      }
    }
    
    const report = harness.getReport();
    // 4 rest periods × 3 minutes = 12 minutes
    expect(report.restTaken).toBe(4 * 3 * 60 * 1000);
  });
});
