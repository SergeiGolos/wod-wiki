import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRuntime } from './test-utils';
import { RoundsBlock } from '../../../src/runtime/blocks/RoundsBlock';

/**
 * Contract tests for RoundsBlock
 * 
 * Validates API contract from contracts/runtime-blocks-api.md:
 * - Constructor validates totalRounds, repScheme
 * - getCurrentRound() returns 1-indexed value
 * - Advances rounds when children complete
 * - Provides compilation context
 * - getRepsForCurrentRound() returns correct value
 * - Emits rounds:changed and rounds:complete
 *
 * STATUS: MUST FAIL initially (TDD)
 */

describe('RoundsBlock Contract', () => {
  let runtime: ReturnType<typeof createMockRuntime>;

  beforeEach(() => {
    runtime = createMockRuntime();
  });

  describe('Constructor Validation', () => {
    it('should reject totalRounds < 1', () => {
      expect(() => {
        new RoundsBlock(runtime, [], { totalRounds: 0, children: [{}] });
      }).toThrow();
    });

    it('should reject empty children array', () => {
      expect(() => {
        new RoundsBlock(runtime, [], { totalRounds: 3, children: [] });
      }).toThrow();
    });

    it('should reject repScheme length mismatch', () => {
      expect(() => {
        new RoundsBlock(runtime, [], {
          totalRounds: 3,
          repScheme: [21, 15], // Wrong length
          children: [{}]
        });
      }).toThrow();
    });

    it('should reject invalid rep values in scheme', () => {
      expect(() => {
        new RoundsBlock(runtime, [], {
          totalRounds: 3,
          repScheme: [21, 0, 9], // Zero invalid
          children: [{}]
        });
      }).toThrow();
    });

    it('should accept valid fixed rounds config', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [{}]
      });
      expect(block).toBeDefined();
    });

    it('should accept valid variable rep scheme', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        repScheme: [21, 15, 9],
        children: [{}]
      });
      expect(block).toBeDefined();
    });
  });

  describe('push() - Initialize Rounds', () => {
    it('should initialize currentRound to 1', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [{}] as any
      });
      
      block.push();
      expect(block.getCurrentRound()).toBe(1);
    });

    it('should compile first round children', () => {
      const mockChild = { push: vi.fn() };
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [mockChild] as any
      });
      
      const actions = block.push();
      // Should include push action for child block
    });
  });

  describe('getCurrentRound() - 1-Indexed', () => {
    it('should return 1 for first round', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [{}] as any
      });
      
      block.push();
      expect(block.getCurrentRound()).toBe(1);
    });

    it('should increment after round completion', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [{}] as any
      });
      
      block.push();
      block.next(); // Advance to round 2
      expect(block.getCurrentRound()).toBe(2);
    });

    it('should stay in valid range [1, totalRounds]', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 2,
        children: [{}] as any
      });
      
      block.push();
      block.next(); // Round 2
      block.next(); // Should complete, not go to round 3
      
      const current = block.getCurrentRound();
      expect(current).toBeGreaterThanOrEqual(1);
      expect(current).toBeLessThanOrEqual(2);
    });
  });

  describe('Round Advancement', () => {
    it('should advance to next round when children complete', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [{}] as any
      });
      
      block.push(); // Round 1
      expect(block.getCurrentRound()).toBe(1);
      
      block.next(); // Round 2
      expect(block.getCurrentRound()).toBe(2);
      
      block.next(); // Round 3
      expect(block.getCurrentRound()).toBe(3);
    });

    it('should emit rounds:changed when advancing', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [{}] as any
      });
      
      vi.mocked(runtime.handle).mockClear();
      block.push();
      const actions = block.next();
      
      // Should have emitted rounds:changed event
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'rounds:changed'
        })
      );
    });

    it('should compile children for new round with correct context', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        repScheme: [21, 15, 9],
        children: [{}] as any
      });
      
      block.push(); // Round 1 (21 reps)
      block.next(); // Round 2 (15 reps)
      
      // JIT compiler should receive context with currentRound=2
    });
  });

  describe('Rounds Completion', () => {
    it('should signal completion when all rounds finished', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 2,
        children: [{}] as any
      });
      
      block.push(); // Round 1
      block.next(); // Round 2
      block.next(); // Complete
      
      expect(block.isComplete()).toBe(true);
    });

    it('should emit rounds:complete event', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 2,
        children: [{}] as any
      });
      
      vi.mocked(runtime.handle).mockClear();
      block.push();
      block.next();
      const actions = block.next(); // Complete
      
      // Should have emitted rounds:complete event
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'rounds:complete'
        })
      );
    });
  });

  describe('Compilation Context', () => {
    it('should provide context with current round', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [{}] as any
      });
      
      block.push(); // Round 1
      
      const context = block.getCompilationContext();
      expect(context.currentRound).toBe(1);
      expect(context.totalRounds).toBe(3);
    });

    it('should include rep scheme when configured', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        repScheme: [21, 15, 9],
        children: [{}] as any
      });
      
      const context = block.getCompilationContext();
      expect(context.repScheme).toEqual([21, 15, 9]);
    });

    it('should return correct reps for current round', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        repScheme: [21, 15, 9],
        children: [{}] as any
      });
      
      block.push(); // Round 1
      expect(block.getRepsForCurrentRound()).toBe(21);
      
      block.next(); // Round 2
      expect(block.getRepsForCurrentRound()).toBe(15);
      
      block.next(); // Round 3
      expect(block.getRepsForCurrentRound()).toBe(9);
    });

    it('should return undefined for reps when no scheme', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [{}] as any
      });
      
      block.push();
      expect(block.getRepsForCurrentRound()).toBeUndefined();
    });
  });

  describe('AMRAP Support (Infinite Rounds)', () => {
    it('should support Infinity as totalRounds', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: Infinity,
        children: [{}] as any
      });
      
      block.push();
      expect(block.getTotalRounds()).toBe(Infinity);
    });

    it('should never signal completion for infinite rounds', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: Infinity,
        children: [{}] as any
      });
      
      block.push();
      for (let i = 0; i < 100; i++) {
        block.next();
      }
      
      expect(block.isComplete()).toBe(false);
    });
  });

  describe('Lazy Compilation', () => {
    it('should compile round children on-demand', () => {
      const compileSpy = vi.spyOn(runtime.jit, 'compile');
      
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [{}] as any // Template
      });
      
      // Should NOT compile all rounds at construction
      expect(compileSpy).not.toHaveBeenCalled();
      
      block.push(); // Should compile round 1
      expect(compileSpy).toHaveBeenCalledTimes(1);
      
      block.next(); // Should compile round 2
      expect(compileSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Disposal', () => {
    it('should dispose all child blocks', () => {
      const mockChild = { dispose: vi.fn() };
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 1,
        children: [mockChild] as any
      });
      
      block.push();
      block.dispose();
      
      expect(mockChild.dispose).toHaveBeenCalled();
    });

    it('should complete disposal in <50ms', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [{}] as any
      });
      
      block.push();
      
      const startTime = performance.now();
      block.dispose();
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Performance', () => {
    it('should execute push() in <1ms', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [{}] as any
      });
      
      const startTime = performance.now();
      block.push();
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(1);
    });

    it('should execute pop() in <1ms', () => {
      const block = new RoundsBlock(runtime, [], {
        totalRounds: 3,
        children: [{}] as any
      });
      
      block.push();
      
      const startTime = performance.now();
      block.pop();
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(1);
    });
  });
});
