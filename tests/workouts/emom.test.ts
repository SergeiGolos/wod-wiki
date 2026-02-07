import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WorkoutTestHarness, WorkoutTestBuilder } from '@/testing/harness/WorkoutTestHarness';
import { IntervalLogicStrategy } from '@/runtime/compiler/strategies/logic/IntervalLogicStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';
import { CrossFitDialect } from '@/dialects';

/**
 * EMOM - Every Minute on the Minute
 * 
 * Stack Expectations:
 * - mount() → pushes repeating timer block (round 1 of N), then pushes first child
 * - next() → pops current child, pushes next child
 * - When all children complete, advances to next round, waits for timer boundary
 * - complete() → pops the repeating timer after final round
 */
describe('EMOM (Every Minute on the Minute)', () => {
  let harness: WorkoutTestHarness;

  afterEach(() => {
    harness?.dispose();
  });

  describe('Basic EMOM: (20) :60', () => {
    beforeEach(() => {
      harness = new WorkoutTestBuilder()
        .withScript(`(20) :60 
  5 pushups
  10 situps`)
        .withDialect(new CrossFitDialect())
        .withStrategy(new IntervalLogicStrategy())
        .withStrategy(new ChildrenStrategy())
        .withStrategy(new EffortFallbackStrategy())
        .build();
    });

    it('should push repeating timer block and first child on mount', () => {
      harness.mount();
      
      // Stack should have: [EMOM block, first child (5 pushups)]
      expect(harness.stackDepth).toBeGreaterThanOrEqual(2);
      expect(harness.currentBlock?.label).toContain('pushups');
    });

    it('should advance through children with next()', () => {
      harness.mount();
      
      // First child is 5 pushups
      expect(harness.currentBlock?.label).toContain('pushups');
      
      harness.next(); // Complete pushups
      
      // Should now be on situps
      expect(harness.currentBlock?.label).toContain('situps');
    });

    it('should advance to next round after completing all children', () => {
      harness.mount();
      
      // Round 1
      harness.next(); // Complete pushups
      harness.next(); // Complete situps - should trigger round 2
      
      // Advance clock to next minute boundary
      harness.advanceClock(60 * 1000);
      
      // Should be back on pushups for round 2
      expect(harness.currentBlock?.label).toContain('pushups');
    });

    it('should complete after all rounds', () => {
      harness.mount();
      
      // 20 rounds means 20 child completions (not 20 full cycles)
      // Each next() completes a child and advances the round counter
      for (let i = 0; i < 20; i++) {
        harness.next();
        harness.advanceClock(60 * 1000);
        harness.completeRound();
      }
      
      expect(harness.isComplete()).toBe(true);
      expect(harness.getReport().roundsCompleted).toBe(20);
    });

    it('should track total reps correctly', () => {
      harness.mount();
      
      // 20 rounds means 20 child completions
      // Children alternate: pushups, situps, pushups, situps, ...
      // After 20 child completions: 10 pushups rounds + 10 situps rounds
      for (let i = 0; i < 20; i++) {
        harness.next();
        harness.advanceClock(60 * 1000);
        harness.completeRound();
      }
      
      const report = harness.getReport();
      // 10 rounds of 5 pushups each = 50 total
      expect(report.totalReps['pushups']).toBe(50);
      // 10 rounds of 10 situps each = 100 total
      expect(report.totalReps['situps']).toBe(100);
    });
  });
});
