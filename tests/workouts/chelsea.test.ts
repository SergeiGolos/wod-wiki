import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WorkoutTestHarness, WorkoutTestBuilder } from '@/testing/harness/WorkoutTestHarness';
import { IntervalLogicStrategy } from '@/runtime/compiler/strategies/logic/IntervalLogicStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

/**
 * Chelsea - 30-minute EMOM with 3 exercises
 * 
 * Stack Expectations:
 * - mount() → pushes EMOM block (round 1 of 30), then pushes first child (5 Pullups)
 * - next() → pops Pullups, pushes 10 Pushups
 * - next() → pops Pushups, pushes 15 Air Squats
 * - next() → pops Air Squats, advances to round 2, waits for :60 boundary, pushes 5 Pullups
 * - ... repeats for 30 rounds
 * - complete() → pops EMOM block after round 30
 */
describe('Chelsea (30-minute EMOM with 3 exercises)', () => {
  let harness: WorkoutTestHarness;

  beforeEach(() => {
    harness = new WorkoutTestBuilder()
      .withScript(`(30) :60 EMOM
  - 5 Pullups
  - 10 Pushups
  - 15 Air Squats`)
      .withStrategy(new IntervalLogicStrategy())
      .withStrategy(new ChildrenStrategy())
      .withStrategy(new EffortFallbackStrategy())
      .build();
  });

  afterEach(() => {
    harness?.dispose();
  });

  it('should push EMOM block and first child on mount', () => {
    harness.mount();
    
    expect(harness.stackDepth).toBeGreaterThanOrEqual(2);
    expect(harness.currentBlock?.label).toContain('Pullups');
  });

  it('should advance through 3 exercises per round', () => {
    harness.mount();
    
    // Exercise 1: Pullups
    expect(harness.currentBlock?.label).toContain('Pullups');
    harness.next();
    
    // Exercise 2: Pushups
    expect(harness.currentBlock?.label).toContain('Pushups');
    harness.next();
    
    // Exercise 3: Air Squats
    expect(harness.currentBlock?.label).toContain('Air Squats');
  });

  it('should complete after 30 rounds when timer boundaries pass', () => {
    harness.mount();
    
    for (let round = 1; round <= 30; round++) {
      harness.next(); // Pullups
      harness.next(); // Pushups
      harness.next(); // Air Squats
      
      // Advance to next minute boundary
      harness.advanceClock(60 * 1000);
      harness.completeRound();
    }
    
    expect(harness.isComplete()).toBe(true);
    expect(harness.getReport().roundsCompleted).toBe(30);
  });

  it('should allow early completion mid-EMOM', () => {
    harness.mount();
    
    // Complete 10 rounds
    for (let round = 1; round <= 10; round++) {
      harness.next(); // Pullups
      harness.next(); // Pushups
      harness.next(); // Air Squats
      harness.advanceClock(60 * 1000);
      harness.completeRound();
    }
    
    // User stops at 10 minutes
    harness.complete();
    
    expect(harness.isComplete()).toBe(true);
    expect(harness.getReport().roundsCompleted).toBe(10);
    expect(harness.getReport().elapsedTime).toBe(10 * 60 * 1000);
  });

  it('should track correct total reps for 30 rounds', () => {
    harness.mount();
    
    for (let round = 1; round <= 30; round++) {
      harness.next(); // 5 Pullups
      harness.next(); // 10 Pushups
      harness.next(); // 15 Air Squats
      harness.advanceClock(60 * 1000);
      harness.completeRound();
    }
    
    const report = harness.getReport();
    expect(report.totalReps['Pullups']).toBe(150);     // 5 * 30
    expect(report.totalReps['Pushups']).toBe(300);     // 10 * 30
    expect(report.totalReps['Air Squats']).toBe(450);  // 15 * 30
  });
});
