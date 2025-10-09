import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRuntime } from './test-utils';
import { createEventCapture } from './event-test-utils';
import { RoundsBehavior } from '../../../src/runtime/behaviors/RoundsBehavior';

/**
 * Contract tests for RoundsBehavior
 * 
 * Validates API contract from contracts/runtime-blocks-api.md:
 * - Constructor validates totalRounds >= 1
 * - onPush() initializes currentRound = 1
 * - onNext() advances currentRound
 * - Emits rounds:changed on advancement
 * - Emits rounds:complete when finished
 * - Provides compilation context with correct rep scheme
 *
 * STATUS: Implementation complete, tests should pass
 */

describe('RoundsBehavior Contract', () => {
  let runtime: ReturnType<typeof createMockRuntime>;
  let eventCapture: ReturnType<typeof createEventCapture>;

  beforeEach(() => {
    runtime = createMockRuntime();
    eventCapture = createEventCapture();
  });

  describe('Constructor', () => {
    it('should accept valid totalRounds', () => {
      const behavior = new RoundsBehavior(3);
      expect(behavior).toBeDefined();
    });

    it('should accept totalRounds with rep scheme', () => {
      const behavior = new RoundsBehavior(3, [21, 15, 9]);
      expect(behavior).toBeDefined();
    });

    it('should reject totalRounds < 1', () => {
      expect(() => new RoundsBehavior(0)).toThrow();
    });

    it('should reject repScheme length mismatch', () => {
      expect(() => new RoundsBehavior(3, [21, 15])).toThrow(); // Wrong length
    });

    it('should reject invalid rep values', () => {
      expect(() => new RoundsBehavior(3, [21, 0, 9])).toThrow(); // Zero reps invalid
    });
  });

  describe('onPush()', () => {
    it('should initialize currentRound to 1', () => {
      const behavior = new RoundsBehavior(3);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      const context = behavior.getCompilationContext?.();
      expect(context?.currentRound).toBe(1);
    });

    it('should allocate memory for round tracking', () => {
      const behavior = new RoundsBehavior(3);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      expect(runtime.memory.allocate).toHaveBeenCalled();
    });
  });

  describe('onNext()', () => {
    it('should advance currentRound', () => {
      const behavior = new RoundsBehavior(3);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      const context1 = behavior.getCompilationContext?.();
      expect(context1?.currentRound).toBe(1);
      
      behavior.onNext(runtime, mockBlock); // Should advance to round 2
      const context2 = behavior.getCompilationContext?.();
      expect(context2?.currentRound).toBe(2);
    });

    it('should emit rounds:changed event via runtime.handle()', () => {
      const behavior = new RoundsBehavior(3);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      runtime.handle = vi.fn(); // Reset to track only onNext calls
      
      behavior.onNext(runtime, mockBlock);
      
      // Should call runtime.handle with rounds:changed event
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'rounds:changed',
          data: expect.objectContaining({
            currentRound: 2,
          }),
        })
      );
    });

    it('should not advance beyond totalRounds', () => {
      const behavior = new RoundsBehavior(3);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      behavior.onNext(runtime, mockBlock); // Round 2
      behavior.onNext(runtime, mockBlock); // Round 3
      
      const context = behavior.getCompilationContext?.();
      expect(context?.currentRound).toBe(3);
      
      // Attempting to advance beyond should signal completion
      runtime.handle = vi.fn(); // Reset to track completion call
      behavior.onNext(runtime, mockBlock);
      
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'rounds:complete',
        })
      );
    });
  });

  describe('Rounds Completion', () => {
    it('should emit rounds:complete when all rounds finished', () => {
      const behavior = new RoundsBehavior(2);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      behavior.onNext(runtime, mockBlock); // Round 2
      
      runtime.handle = vi.fn(); // Reset to track completion call
      behavior.onNext(runtime, mockBlock); // Complete
      
      // Should emit rounds:complete
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'rounds:complete',
        })
      );
    });

    it('should include accurate round counts in completion event', () => {
      const behavior = new RoundsBehavior(3);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      behavior.onNext(runtime, mockBlock); // Round 2
      behavior.onNext(runtime, mockBlock); // Round 3
      
      runtime.handle = vi.fn(); // Reset to track completion call
      behavior.onNext(runtime, mockBlock); // Complete
      
      // Verify completion event data
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'rounds:complete',
          data: expect.objectContaining({
            totalRoundsCompleted: 3,
          }),
        })
      );
    });
  });

  describe('Compilation Context', () => {
    it('should provide context with current round', () => {
      const behavior = new RoundsBehavior(3);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock); // Initialize to round 1
      const context = behavior.getCompilationContext?.();
      expect(context?.currentRound).toBe(1);
    });

    it('should provide rep scheme when configured', () => {
      const behavior = new RoundsBehavior(3, [21, 15, 9]);
      
      const context = behavior.getCompilationContext?.();
      expect(context?.repScheme).toEqual([21, 15, 9]);
    });

    it('should return correct reps for current round', () => {
      const behavior = new RoundsBehavior(3, [21, 15, 9]);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock); // Round 1
      const context1 = behavior.getCompilationContext?.();
      expect(context1?.getRepsForCurrentRound?.()).toBe(21);
      
      behavior.onNext(runtime, mockBlock); // Round 2
      const context2 = behavior.getCompilationContext?.();
      expect(context2?.getRepsForCurrentRound?.()).toBe(15);
    });

    it('should return undefined for reps when no scheme configured', () => {
      const behavior = new RoundsBehavior(3);
      
      const context = behavior.getCompilationContext?.();
      expect(context?.getRepsForCurrentRound?.()).toBeUndefined();
    });
  });

  describe('AMRAP Support (Infinite Rounds)', () => {
    it('should support Infinity as totalRounds', () => {
      const behavior = new RoundsBehavior(Infinity);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      expect(behavior).toBeDefined();
      
      const context = behavior.getCompilationContext?.();
      expect(context?.totalRounds).toBe(Infinity);
    });

    it('should never emit rounds:complete for infinite rounds', () => {
      const behavior = new RoundsBehavior(Infinity);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      for (let i = 0; i < 100; i++) {
        const actions = behavior.onNext(runtime, mockBlock);
        const completeAction = actions.find((a: any) => a.type === 'emit' && a.event?.includes('rounds:complete'));
        expect(completeAction).toBeUndefined();
      }
    });
  });

  describe('Disposal', () => {
    it('should clean up memory references on dispose', () => {
      const behavior = new RoundsBehavior(3);
      const mockBlock = { key: { toString: () => 'test' } } as any;
      
      behavior.onPush(runtime, mockBlock);
      behavior.onDispose?.(runtime, mockBlock);
      expect(runtime.memory.release).toHaveBeenCalled();
    });
  });
});
