import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WorkoutTestHarness, WorkoutTestBuilder } from '@/testing/harness/WorkoutTestHarness';
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

/**
 * Cindy - 20-minute AMRAP
 * 
 * Stack Expectations:
 * - mount() → pushes AMRAP timer block (20:00 countdown), then pushes first child (5 Pullups)
 * - next() → pops Pullups, pushes 10 Pushups
 * - next() → pops Pushups, pushes 15 Air Squats
 * - next() → pops Air Squats, increments round count, pushes 5 Pullups (new round)
 * - ... continues until 20:00 timer expires
 * - Timer expiration → auto-completes AMRAP block
 * 
 * Report Expectations:
 * - Rounds completed (target: 10-20 for intermediate)
 * - Partial round tracking (e.g., "15+7" = 15 full rounds + 7 reps into round 16)
 * - Total elapsed time: 20:00
 */
describe('Cindy (20-minute AMRAP)', () => {
  let harness: WorkoutTestHarness;

  beforeEach(() => {
    harness = new WorkoutTestBuilder()
      .withScript(`20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats`)
      .withStrategy(new AmrapLogicStrategy())
      .withStrategy(new ChildrenStrategy())
      .withStrategy(new EffortFallbackStrategy())
      .build();
  });

  afterEach(() => {
    harness?.dispose();
  });

  it('should push AMRAP block and first child on mount', () => {
    harness.mount();
    
    expect(harness.stackDepth).toBeGreaterThanOrEqual(2);
    expect(harness.currentBlock?.label).toContain('Pullups');
  });

  it('should loop through exercises continuously', () => {
    harness.mount();
    
    // Round 1
    expect(harness.currentBlock?.label).toContain('Pullups');
    harness.next();
    expect(harness.currentBlock?.label).toContain('Pushups');
    harness.next();
    expect(harness.currentBlock?.label).toContain('Air Squats');
    harness.next();
    harness.completeRound();
    
    // Round 2 - should loop back to Pullups
    expect(harness.currentBlock?.label).toContain('Pullups');
  });

  it('should auto-complete when timer expires', () => {
    harness.mount();
    
    // Simulate 3 full rounds (fast completion)
    for (let i = 0; i < 3; i++) {
      harness.next(); // Pullups
      harness.next(); // Pushups
      harness.next(); // Air Squats
      harness.completeRound();
    }
    
    // Advance clock to expiration (20 minutes)
    harness.advanceClock(20 * 60 * 1000);
    
    expect(harness.isComplete()).toBe(true);
    expect(harness.getReport().roundsCompleted).toBe(3);
  });

  it('should allow early completion via complete button', () => {
    harness.mount();
    
    // Simulate 2 full rounds + partial
    for (let i = 0; i < 2; i++) {
      harness.next(); // Pullups
      harness.next(); // Pushups
      harness.next(); // Air Squats
      harness.completeRound();
    }
    harness.next(); // 1 exercise into round 3 (Pullups)
    
    // User presses complete early (only 5 minutes in)
    harness.advanceClock(5 * 60 * 1000);
    harness.complete();
    
    expect(harness.isComplete()).toBe(true);
    expect(harness.getReport().roundsCompleted).toBe(2);
    expect(harness.getReport().partialReps).toBe(1); // 1 exercise done in partial round
    expect(harness.getReport().elapsedTime).toBeLessThan(20 * 60 * 1000);
  });

  it('should track total reps correctly', () => {
    harness.mount();
    
    // Complete 5 rounds
    for (let i = 0; i < 5; i++) {
      harness.next(); // 5 Pullups
      harness.next(); // 10 Pushups
      harness.next(); // 15 Air Squats
      harness.completeRound();
    }
    
    const report = harness.getReport();
    expect(report.totalReps['Pullups']).toBe(25);      // 5 * 5
    expect(report.totalReps['Pushups']).toBe(50);      // 10 * 5
    expect(report.totalReps['Air Squats']).toBe(75);   // 15 * 5
  });
});
