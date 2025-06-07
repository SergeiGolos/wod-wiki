import { describe, it, expect, vi } from 'vitest';
import { RuntimeJitStrategies } from './RuntimeJitStrategies';
import { TimerBlock } from './blocks/TimerBlock';
import { TimedGroupBlock } from './blocks/TimedGroupBlock';
import { EffortBlock } from './blocks/EffortBlock';
import { JitStatement } from '@/core/JitStatement';
import { ITimerRuntime } from '@/core/ITimerRuntime';
import { Duration } from '@/core/Duration';
import { BlockKey } from '@/core/BlockKey';

// Comprehensive mock for JitStatement with all required methods
function createMockStatement(options: {
  hasDuration?: boolean;
  hasEffort?: boolean;
  hasRepetitions?: boolean;
  hasChildren?: boolean;
  hasRounds?: boolean;
  duration?: number;
}): JitStatement {
  const {
    hasDuration = false,
    hasEffort = false,
    hasRepetitions = false,
    hasChildren = false,
    hasRounds = false,
    duration = 30000,
  } = options;

  return {
    id: 'test-statement',
    parent: undefined,
    children: hasChildren ? ['child-id'] : [],
    meta: {},
    fragments: [],
    duration: (blockKey: BlockKey) => new Duration(hasDuration ? duration : undefined),
    durations: () => hasDuration ? [new Duration(duration)] : [],
    efforts: () => hasEffort ? [{ effort: 'pushups' }] : [],
    effort: (blockKey: BlockKey | number) => hasEffort ? { effort: 'pushups' } : undefined,
    rounds: () => hasRounds ? [{ value: 3 }] : [],
    round: (blockKey: BlockKey | number) => hasRounds ? { value: 3 } : undefined,
    repetitions: () => hasRepetitions ? [{ value: 10 }] : [],
    repetition: (blockKey: BlockKey | number) => hasRepetitions ? { value: 10 } : undefined,
    resistances: () => [],
    resistance: (blockKey: BlockKey | number) => undefined,
    distances: () => [],
    distance: (blockKey: BlockKey | number) => undefined,
    increments: () => [],
    increment: (blockKey: BlockKey | number) => undefined,
    laps: () => [],
    lap: (blockKey: BlockKey | number) => undefined,
    toString: () => 'test statement',
  } as any;
}

describe('RuntimeJitStrategies Integration Tests', () => {
  const strategies = new RuntimeJitStrategies();
  const mockRuntime = {
    script: {
      root: [] // BlockRootStrategy expects an array of JitStatements
    }
  } as ITimerRuntime;

  describe('Strategy Selection Priority', () => {
    it('should select TimerBlock for duration-only statements', () => {
      // Test case: "30s" - duration only, no effort/reps/children/rounds
      const statement = createMockStatement({ hasDuration: true });
      
      const block = strategies.compile([statement], mockRuntime);
      
      expect(block).toBeInstanceOf(TimerBlock);
      expect(block).not.toBeInstanceOf(EffortBlock);
    });

    it('should select TimedGroupBlock for group countdown scenarios', () => {
      // Test case: "5m AMRAP { pullups; pushups }" - duration + children
      const statement = createMockStatement({ 
        hasDuration: true, 
        hasChildren: true, 
        duration: 300000 
      });
      
      const block = strategies.compile([statement], mockRuntime);
      
      expect(block).toBeInstanceOf(TimedGroupBlock);
      expect(block).not.toBeInstanceOf(TimerBlock);
    });

    it('should select EffortBlock for effort/repetition statements without duration', () => {
      // Test case: "10 pushups" - effort + reps, no duration
      const statement = createMockStatement({ 
        hasEffort: true, 
        hasRepetitions: true 
      });
      
      const block = strategies.compile([statement], mockRuntime);
      
      expect(block).toBeInstanceOf(EffortBlock);
      expect(block).not.toBeInstanceOf(TimerBlock);
    });

    it('should select EffortBlock for effort statements with duration', () => {
      // Test case: "30s pushups" - effort + duration (should be EffortBlock, not TimerBlock)
      const statement = createMockStatement({ 
        hasEffort: true, 
        hasDuration: true 
      });
      
      const block = strategies.compile([statement], mockRuntime);
      
      expect(block).toBeInstanceOf(EffortBlock);
      expect(block).not.toBeInstanceOf(TimerBlock);
    });

    it('should prefer GroupCountdownStrategy over BlockTimerStrategy for groups with duration', () => {
      // Test case: "20m { run 400m; rest }" - duration + children
      // Should select TimedGroupBlock via GroupCountdownStrategy, not TimerBlock
      const statement = createMockStatement({ 
        hasDuration: true, 
        hasChildren: true, 
        duration: 1200000 
      });
      
      const block = strategies.compile([statement], mockRuntime);
      
      expect(block).toBeInstanceOf(TimedGroupBlock);
      expect(block).not.toBeInstanceOf(TimerBlock);
    });
  });

  describe('Complex Scenario Handling', () => {
    it('should handle AMRAP scenarios correctly', () => {
      // Test case: "12m AMRAP { 10 burpees; 15 pullups }"
      const statement = createMockStatement({ 
        hasDuration: true, 
        hasChildren: true, 
        duration: 720000  // 12 minutes
      });
      
      const block = strategies.compile([statement], mockRuntime);
      
      expect(block).toBeInstanceOf(TimedGroupBlock);
      expect(block?.sources[0]).toBe(statement);
    });

    it('should handle timed group with rounds', () => {
      // Test case: "20m 3 rounds { run 400m; rest 1m }"
      const statement = createMockStatement({ 
        hasDuration: true, 
        hasChildren: true, 
        hasRounds: true,
        duration: 1200000  // 20 minutes
      });
      
      const block = strategies.compile([statement], mockRuntime);
      
      expect(block).toBeInstanceOf(TimedGroupBlock);
    });

    it('should handle different timer durations', () => {
      const testCases = [
        { duration: 30000, name: "30 seconds" },
        { duration: 120000, name: "2 minutes" },
        { duration: 600000, name: "10 minutes" },
      ];

      testCases.forEach(({ duration, name }) => {
        const statement = createMockStatement({ hasDuration: true, duration });
        
        const block = strategies.compile([statement], mockRuntime);
        
        expect(block).toBeInstanceOf(TimerBlock);
        expect(block?.duration).toBe(duration);
      });
    });
  });

  describe('Strategy Registration Order', () => {
    it('should have correct strategy priority order', () => {
      // The strategies should be ordered such that:
      // 1. BlockRootStrategy (highest priority)
      // 2. GroupRepeatingStrategy 
      // 3. GroupCountdownStrategy
      // 4. BlockTimerStrategy
      // 5. BlockEffortStrategy (lowest priority)
      
      // We can't directly access the private strategies array, but we can test behavior
      // Group strategies should take precedence over single block strategies
      const groupStatement = createMockStatement({ 
        hasDuration: true, 
        hasChildren: true 
      });
      const timerStatement = createMockStatement({ 
        hasDuration: true 
      });
      
      expect(strategies.compile([groupStatement], mockRuntime)).toBeInstanceOf(TimedGroupBlock);
      expect(strategies.compile([timerStatement], mockRuntime)).toBeInstanceOf(TimerBlock);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty statement arrays', () => {
      const block = strategies.compile([], mockRuntime);
      
      expect(block).toBeUndefined();
    });

    it('should handle statements with no matching strategy', () => {
      // Create a statement that doesn't match any strategy
      // Make it have a parent so BlockRootStrategy doesn't match
      const statement = createMockStatement({}); // No duration, effort, reps, children, or rounds
      statement.parent = 'parent-id'; // Add parent so it's not a root statement
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const block = strategies.compile([statement], mockRuntime);
      
      expect(block).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No strategy matched for nodes')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle multiple statements for TimerBlock strategy', () => {
      const statement1 = createMockStatement({ hasDuration: true, duration: 30000 });
      const statement2 = createMockStatement({ hasDuration: true, duration: 60000 });
      
      const block = strategies.compile([statement1, statement2], mockRuntime);
      
      expect(block).toBeInstanceOf(TimerBlock);
      expect(block?.sources).toEqual([statement1, statement2]);
    });
  });

  describe('Backward Compatibility', () => {
    it('should still handle existing effort-based scenarios', () => {
      // Existing behavior should be unchanged
      const effortStatement = createMockStatement({ 
        hasEffort: true, 
        hasRepetitions: true 
      });
      
      const block = strategies.compile([effortStatement], mockRuntime);
      
      expect(block).toBeInstanceOf(EffortBlock);
    });

    it('should still handle existing group scenarios without duration', () => {
      // Groups without duration should still work (via GroupRepeatingStrategy)
      const groupStatement = createMockStatement({ 
        hasChildren: true, 
        hasRounds: true 
      });
      groupStatement.parent = 'parent-id'; // Add parent so BlockRootStrategy doesn't match
      
      const block = strategies.compile([groupStatement], mockRuntime);
      
      // Should not be TimerBlock or create through GroupCountdownStrategy
      expect(block).not.toBeInstanceOf(TimerBlock);
      // Note: We can't easily test for RepeatingBlock here without importing it
      // but the important thing is it's not handled by our new strategies
    });
  });
});