import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WorkoutTestHarness, WorkoutTestBuilder } from '@/testing/harness/WorkoutTestHarness';
import { GenericLoopStrategy } from '@/runtime/compiler/strategies/components/GenericLoopStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

/**
 * Annie - 50-40-30-20-10 Descending Scheme
 * 
 * Stack Expectations:
 * - mount() → pushes rep scheme block (round 1: 50 reps), pushes 50 Double-Unders
 * - next() → pops Double-Unders, pushes 50 Situps
 * - next() → pops Situps, advances to round 2 (40 reps), pushes 40 Double-Unders
 * - ... continues through 5 rounds (50, 40, 30, 20, 10)
 * - Final next() → completes rep scheme block
 * 
 * Report Expectations:
 * - Total time for completion
 * - Total reps: 150 Double-Unders, 150 Situps
 * - Split times per round
 */
describe('Annie (50-40-30-20-10 Descending Scheme)', () => {
  let harness: WorkoutTestHarness;

  beforeEach(() => {
    harness = new WorkoutTestBuilder()
      .withScript(`(50-40-30-20-10)
  Double-Unders
  Situps`)
      .withStrategy(new GenericLoopStrategy())
      .withStrategy(new ChildrenStrategy())
      .withStrategy(new EffortFallbackStrategy())
      .build();
  });

  afterEach(() => {
    harness?.dispose();
  });

  it('should push rep scheme block and first child on mount', () => {
    harness.mount();
    
    expect(harness.stackDepth).toBeGreaterThanOrEqual(2);
    expect(harness.currentBlock?.label).toContain('Double-Unders');
  });

  it('should execute 50 reps in round 1', () => {
    harness.mount();
    
    // 50 Double-Unders
    expect(harness.currentBlock?.label).toContain('Double-Unders');
    harness.next();
    
    // 50 Situps
    expect(harness.currentBlock?.label).toContain('Situps');
  });

  it('should advance through all 5 rounds', () => {
    harness.mount();
    const repScheme = [50, 40, 30, 20, 10];
    
    for (let round = 0; round < repScheme.length; round++) {
      // Double-Unders
      harness.next();
      // Situps
      harness.next();
      harness.completeRound();
    }
    
    expect(harness.isComplete()).toBe(true);
    expect(harness.getReport().roundsCompleted).toBe(5);
  });

  it('should track total reps correctly (150 of each)', () => {
    harness.mount();
    
    // All 5 rounds
    for (let i = 0; i < 5; i++) {
      harness.next(); // Double-Unders
      harness.next(); // Situps
      harness.completeRound();
    }
    
    const report = harness.getReport();
    // 50 + 40 + 30 + 20 + 10 = 150 of each
    expect(report.totalReps['Double-Unders']).toBe(150);
    expect(report.totalReps['Situps']).toBe(150);
  });

  it('should allow early completion', () => {
    harness.mount();
    
    // Complete only 2 rounds (50 + 40 = 90 of each)
    for (let i = 0; i < 2; i++) {
      harness.next(); // Double-Unders
      harness.next(); // Situps
      harness.completeRound();
    }
    
    harness.complete();
    
    expect(harness.isComplete()).toBe(true);
    expect(harness.getReport().roundsCompleted).toBe(2);
  });

  it('should track split times per round', () => {
    harness.mount();
    const repScheme = [50, 40, 30, 20, 10];
    
    for (let round = 0; round < repScheme.length; round++) {
      harness.next();
      harness.advanceClock(repScheme[round] * 1000); // 1 sec per rep
      harness.next();
      harness.advanceClock(repScheme[round] * 1000);
      harness.completeRound();
    }
    
    const report = harness.getReport();
    expect(report.outputs.length).toBeGreaterThan(0);
    // Total: 2 * (50+40+30+20+10) = 300 seconds
    expect(report.elapsedTime).toBe(300 * 1000);
  });
});
