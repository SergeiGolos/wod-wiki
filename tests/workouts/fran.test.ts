import { describe, it, expect, beforeEach } from 'bun:test';
import { WorkoutTestHarness, WorkoutTestBuilder } from '@/testing/harness/WorkoutTestHarness';
import { GenericLoopStrategy } from '@/runtime/compiler/strategies/components/GenericLoopStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

/**
 * Fran - 21-15-9 Descending Rep Scheme
 * 
 * Stack Expectations:
 * - mount() → pushes rep scheme block (round 1: 21 reps), pushes 21 Thrusters
 * - next() → pops Thrusters, pushes 21 Pullups
 * - next() → pops Pullups, advances to round 2 (15 reps), pushes 15 Thrusters
 * - next() → pops Thrusters, pushes 15 Pullups
 * - next() → pops Pullups, advances to round 3 (9 reps), pushes 9 Thrusters
 * - next() → pops Thrusters, pushes 9 Pullups
 * - next() → pops Pullups, completes rep scheme block
 * 
 * Report Expectations:
 * - Total time for completion
 * - Total reps: 45 Thrusters, 45 Pullups
 * - Split times per round (21s, 15s, 9s)
 */
describe('Fran (21-15-9 Descending Rep Scheme)', () => {
  let harness: WorkoutTestHarness;

  beforeEach(() => {
    harness = new WorkoutTestBuilder()
      .withScript(`(21-15-9) 
  Thrusters 95lb
  Pullups`)
      .withStrategy(new GenericLoopStrategy())
      .withStrategy(new ChildrenStrategy())
      .withStrategy(new EffortFallbackStrategy())
      .build();
  });

  it('should push rep scheme block and first child on mount', () => {
    harness.mount();
    
    expect(harness.stackDepth).toBeGreaterThanOrEqual(2);
    // First round should show 21 reps
    expect(harness.currentBlock?.label).toContain('Thrusters');
  });

  it('should execute 21 reps in round 1', () => {
    harness.mount();
    
    // 21 Thrusters
    expect(harness.currentBlock?.label).toContain('Thrusters');
    harness.next();
    
    // 21 Pullups
    expect(harness.currentBlock?.label).toContain('Pullups');
  });

  it('should advance to round 2 (15 reps) after round 1', () => {
    harness.mount();
    
    // Round 1: 21 reps
    harness.next(); // 21 Thrusters
    harness.next(); // 21 Pullups
    harness.completeRound();
    
    // Round 2: 15 reps - should push 15 Thrusters
    expect(harness.currentBlock?.label).toContain('Thrusters');
  });

  it('should complete after all three rounds (21-15-9)', () => {
    harness.mount();
    
    // Round 1: 21 reps
    harness.next(); // 21 Thrusters
    harness.next(); // 21 Pullups
    harness.completeRound();
    
    // Round 2: 15 reps
    harness.next(); // 15 Thrusters
    harness.next(); // 15 Pullups
    harness.completeRound();
    
    // Round 3: 9 reps
    harness.next(); // 9 Thrusters
    harness.next(); // 9 Pullups
    harness.completeRound();
    
    expect(harness.isComplete()).toBe(true);
    expect(harness.getReport().roundsCompleted).toBe(3);
  });

  it('should track total reps correctly (45 of each)', () => {
    harness.mount();
    
    // Round 1: 21
    harness.next(); // Thrusters
    harness.next(); // Pullups
    harness.completeRound();
    
    // Round 2: 15
    harness.next(); // Thrusters
    harness.next(); // Pullups
    harness.completeRound();
    
    // Round 3: 9
    harness.next(); // Thrusters
    harness.next(); // Pullups
    harness.completeRound();
    
    const report = harness.getReport();
    // 21 + 15 + 9 = 45 of each
    expect(report.totalReps['Thrusters 95lb']).toBe(45);
    expect(report.totalReps['Pullups']).toBe(45);
  });

  it('should track split times per round', () => {
    harness.mount();
    
    // Round 1
    harness.next();
    harness.advanceClock(30000); // 30 seconds
    harness.next();
    harness.advanceClock(30000); // 30 seconds
    harness.completeRound();
    
    // Round 2
    harness.next();
    harness.advanceClock(25000);
    harness.next();
    harness.advanceClock(25000);
    harness.completeRound();
    
    // Round 3
    harness.next();
    harness.advanceClock(20000);
    harness.next();
    harness.advanceClock(20000);
    harness.completeRound();
    
    const report = harness.getReport();
    expect(report.spans.length).toBeGreaterThan(0);
    expect(report.elapsedTime).toBe(150000); // 30+30+25+25+20+20 = 150 seconds
  });
});
