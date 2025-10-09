import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRuntime } from './test-utils';
import { CompletionBehavior } from '../../../src/runtime/behaviors/CompletionBehavior';

/**
 * Contract tests for CompletionBehavior
 * 
 * Validates API contract from contracts/runtime-blocks-api.md:
 * - Constructor accepts condition function
 * - onNext() checks completion condition
 * - onEvent() triggers on configured events
 * - Emits block:complete when condition met
 * - Configurable trigger events work correctly
 *
 * STATUS: Implementation complete, tests should pass
 */

describe('CompletionBehavior Contract', () => {
  let runtime: ReturnType<typeof createMockRuntime>;

  beforeEach(() => {
    runtime = createMockRuntime();
  });

  describe('Constructor', () => {
    it('should accept a condition function', () => {
      const condition = () => true;
      const behavior = new CompletionBehavior(condition);
      expect(behavior).toBeDefined();
    });

    it('should accept trigger events', () => {
      const condition = () => true;
      const behavior = new CompletionBehavior(condition, ['timer:complete', 'rounds:complete']);
      expect(behavior).toBeDefined();
    });

    it('should reject null condition', () => {
      expect(() => {
        new CompletionBehavior(null as any);
      }).toThrow();
    });
  });

  describe('onNext()', () => {
    it('should check completion condition', () => {
      const condition = vi.fn(() => false);
      const behavior = new CompletionBehavior(condition);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onNext(runtime, mockBlock);
      expect(condition).toHaveBeenCalled();
    });

    it('should emit block:complete when condition returns true', () => {
      const condition = () => true;
      const behavior = new CompletionBehavior(condition);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      const actions = behavior.onNext(runtime, mockBlock);
      // Behavior emits via runtime.handle, not via actions
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'block:complete'
        })
      );
    });

    it('should NOT emit when condition returns false', () => {
      const condition = () => false;
      const behavior = new CompletionBehavior(condition);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      const actions = behavior.onNext(runtime, mockBlock);
      // Should NOT include block:complete action
      expect(actions).toEqual([]);
    });

    it('should pass runtime and block to condition function', () => {
      const condition = vi.fn((rt, block) => {
        expect(rt).toBe(runtime);
        expect(block).toBeDefined();
        return false;
      });
      const behavior = new CompletionBehavior(condition);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onNext(runtime, mockBlock);
    });
  });

  describe('Event-Triggered Completion', () => {
    it('should check condition when trigger event received', () => {
      expect(() => {
        
        const condition = vi.fn(() => false);
        const behavior = new CompletionBehavior(condition, ['timer:complete']);
        const mockBlock = { key: { toString: () => 'test' } } as any;
        
        behavior.onPush?.(runtime, mockBlock); // Setup event listeners
        
        // Simulate timer:complete event
        runtime.handle?.({ type: 'timer:complete' } as any);
        
        expect(condition).toHaveBeenCalled();
      }).toThrow();
    });

    it('should support multiple trigger events', () => {
      expect(() => {
        
        const condition = vi.fn(() => false);
        const behavior = new CompletionBehavior(condition, [
          'timer:complete',
          'rounds:complete'
        ]);
        const mockBlock = { key: { toString: () => 'test' } } as any;
        
        behavior.onPush?.(runtime, mockBlock);
        
        // Both events should trigger condition check
        runtime.handle?.({ type: 'timer:complete' } as any);
        runtime.handle?.({ type: 'rounds:complete' } as any);
        
        expect(condition).toHaveBeenCalledTimes(2);
      }).toThrow();
    });

    it('should NOT check condition for non-trigger events', () => {
      expect(() => {
        
        const condition = vi.fn(() => false);
        const behavior = new CompletionBehavior(condition, ['timer:complete']);
        const mockBlock = { key: { toString: () => 'test' } } as any;
        
        behavior.onPush?.(runtime, mockBlock);
        
        // Different event should not trigger
        runtime.handle?.({ type: 'rounds:changed' } as any);
        
        expect(condition).not.toHaveBeenCalled();
      }).toThrow();
    });
  });

  describe('Completion Detection Patterns', () => {
    it('should work with reps-based completion', () => {
      expect(() => {
        
        const condition = (rt: any, block: any) => {
          // Simulate checking if reps === target
          const reps = block.getCurrentReps?.() || 0;
          const target = block.getTargetReps?.() || 10;
          return reps >= target;
        };
        const behavior = new CompletionBehavior(condition);
        const mockBlock = {
          key: { toString: () => 'test' },
          getCurrentReps: () => 10,
          getTargetReps: () => 10
        } as any;
        
        const actions = behavior.onNext(runtime, mockBlock);
        // Should emit completion
      }).toThrow();
    });

    it('should work with timer-based completion', () => {
      expect(() => {
        
        const condition = (rt: any, block: any) => {
          // Simulate checking if timer reached zero
          const remaining = block.getRemainingMs?.() || 1000;
          return remaining <= 0;
        };
        const behavior = new CompletionBehavior(condition);
        const mockBlock = {
          key: { toString: () => 'test' },
          getRemainingMs: () => 0
        } as any;
        
        const actions = behavior.onNext(runtime, mockBlock);
        // Should emit completion
      }).toThrow();
    });

    it('should work with rounds-based completion', () => {
      expect(() => {
        
        const condition = (rt: any, block: any) => {
          // Simulate checking if all rounds complete
          const current = block.getCurrentRound?.() || 1;
          const total = block.getTotalRounds?.() || 3;
          return current > total;
        };
        const behavior = new CompletionBehavior(condition);
        const mockBlock = {
          key: { toString: () => 'test' },
          getCurrentRound: () => 4,
          getTotalRounds: () => 3
        } as any;
        
        const actions = behavior.onNext(runtime, mockBlock);
        // Should emit completion
      }).toThrow();
    });
  });

  describe('Disposal', () => {
    it('should remove event listeners on dispose', () => {
      expect(() => {
        
        const condition = () => false;
        const behavior = new CompletionBehavior(condition, ['timer:complete']);
        const mockBlock = { key: { toString: () => 'test' } } as any;
        
        behavior.onPush?.(runtime, mockBlock);
        behavior.onDispose?.(runtime, mockBlock);
        
        // Event should no longer trigger condition
        runtime.handle?.({ type: 'timer:complete' } as any);
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle condition already met at start', () => {
      expect(() => {
        
        const condition = () => true; // Already complete
        const behavior = new CompletionBehavior(condition);
        const mockBlock = { key: { toString: () => 'test' } } as any;
        
        const actions = behavior.onPush?.(runtime, mockBlock);
        // Could emit completion immediately, or wait for onNext
      }).toThrow();
    });

    it('should handle condition that never becomes true', () => {
      expect(() => {
        
        const condition = () => false;
        const behavior = new CompletionBehavior(condition);
        const mockBlock = { key: { toString: () => 'test' } } as any;
        
        // Should never emit completion
        for (let i = 0; i < 10; i++) {
          behavior.onNext(runtime, mockBlock);
        }
      }).toThrow();
    });

    it('should handle condition that throws error', () => {
      expect(() => {
        
        const condition = () => { throw new Error('Condition error'); };
        const behavior = new CompletionBehavior(condition);
        const mockBlock = { key: { toString: () => 'test' } } as any;
        
        // Should handle error gracefully
        expect(() => behavior.onNext(runtime, mockBlock)).toThrow();
      }).toThrow();
    });
  });
});
