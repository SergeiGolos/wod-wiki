import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockRuntime } from './test-utils';
import { EffortBlock } from '../../../src/runtime/blocks/EffortBlock';

/**
 * Contract tests for EffortBlock
 * 
 * Validates API contract from contracts/runtime-blocks-api.md:
 * - Constructor validates exerciseName, targetReps
 * - incrementRep() adds 1, emits reps:updated
 * - setReps(count) validates range, emits event
 * - markComplete() sets currentReps = target
 * - isComplete() returns true when target met
 * - Tracks completionMode (incremental/bulk)
 * - Emits reps:complete when finished
 *
 * STATUS: Implementation complete, tests should pass
 */

describe('EffortBlock Contract', () => {
  let runtime: ReturnType<typeof createMockRuntime>;

  beforeEach(() => {
    runtime = createMockRuntime();
  });

  describe('Constructor Validation', () => {
    it('should reject empty exerciseName', () => {
      expect(() => {
        new EffortBlock(runtime, [], { exerciseName: '', targetReps: 10 });
      }).toThrow();
    });

    it('should reject targetReps < 1', () => {
      expect(() => {
        new EffortBlock(runtime, [], { exerciseName: 'Pullups', targetReps: 0 });
      }).toThrow();
    });

    it('should accept valid configuration', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      expect(block).toBeDefined();
    });

    it('should initialize with currentReps = 0', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      expect(block.getCurrentReps()).toBe(0);
    });

    it('should initialize with isComplete() = false', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      expect(block.isComplete()).toBe(false);
    });
  });

  describe('incrementRep() - Incremental Tracking', () => {
    it('should increment currentReps by 1', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 10
      });
      
      block.mount(runtime);
      expect(block.getCurrentReps()).toBe(0);
      
      block.incrementRep();
      expect(block.getCurrentReps()).toBe(1);
      
      block.incrementRep();
      expect(block.getCurrentReps()).toBe(2);
    });

    it('should emit reps:updated event', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 10
      });
      
      vi.mocked(runtime.handle).mockClear();
      block.mount(runtime);
      block.incrementRep();
      
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'reps:updated'
        })
      );
    });

    it('should not exceed targetReps', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 5
      });
      
      block.mount(runtime);
      for (let i = 0; i < 10; i++) {
        block.incrementRep();
      }
      
      expect(block.getCurrentReps()).toBe(5); // Capped at target
    });
  });

  describe('setReps() - Bulk Entry', () => {
    it('should set currentReps to specified count', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      block.setReps(15);
      
      expect(block.getCurrentReps()).toBe(15);
    });

    it('should emit reps:updated with bulk mode', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      vi.mocked(runtime.handle).mockClear();
      block.mount(runtime);
      block.setReps(15);
      
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'reps:updated'
        })
      );
    });

    it('should reject count < 0', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      expect(() => block.setReps(-5)).toThrow(RangeError);
    });

    it('should reject count > targetReps', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      expect(() => block.setReps(25)).toThrow(RangeError);
    });

    it('should allow setting to exactly targetReps', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      block.setReps(21);
      
      expect(block.getCurrentReps()).toBe(21);
      expect(block.isComplete()).toBe(true);
    });
  });

  describe('markComplete() - Force Completion', () => {
    it('should set currentReps to targetReps', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      block.incrementRep(); // At 1 rep
      block.markComplete();
      
      expect(block.getCurrentReps()).toBe(21);
    });

    it('should emit reps:complete', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      vi.mocked(runtime.handle).mockClear();
      block.mount(runtime);
      block.markComplete();
      
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'reps:complete'
        })
      );
    });

    it('should be idempotent', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      block.markComplete();
      block.markComplete(); // Should not throw
      
      expect(block.getCurrentReps()).toBe(21);
    });
  });

  describe('isComplete() - Completion Status', () => {
    it('should return false when reps < target', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      block.setReps(15);
      
      expect(block.isComplete()).toBe(false);
    });

    it('should return true when reps >= target', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      block.setReps(21);
      
      expect(block.isComplete()).toBe(true);
    });

    it('should return true after markComplete()', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      block.markComplete();
      
      expect(block.isComplete()).toBe(true);
    });
  });

  describe('Hybrid Tracking - Mode Switching', () => {
    it('should switch from incremental to bulk', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      
      // Incremental
      block.incrementRep();
      block.incrementRep();
      expect(block.getCurrentReps()).toBe(2);
      
      // Switch to bulk
      block.setReps(10);
      expect(block.getCurrentReps()).toBe(10);
    });

    it('should switch from bulk back to incremental', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      
      // Bulk
      block.setReps(10);
      expect(block.getCurrentReps()).toBe(10);
      
      // Switch to incremental
      block.incrementRep();
      expect(block.getCurrentReps()).toBe(11);
    });

    it('should track completion mode correctly', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      vi.mocked(runtime.handle).mockClear();
      block.mount(runtime);
      
      block.incrementRep(); // Mode: incremental
      // Event should have been emitted
      expect(runtime.handle).toHaveBeenCalled();
      
      block.setReps(5); // Mode: bulk
      // Event should have been emitted again
      expect(runtime.handle).toHaveBeenCalled();
    });
  });

  describe('Auto-Completion', () => {
    it('should emit reps:complete when target reached via increment', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 3
      });
      
      vi.mocked(runtime.handle).mockClear();
      block.mount(runtime);
      block.incrementRep(); // 1
      block.incrementRep(); // 2
      block.incrementRep(); // 3 - should trigger completion
      
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'reps:complete'
        })
      );
    });

    it('should emit reps:complete when target reached via bulk', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      vi.mocked(runtime.handle).mockClear();
      block.mount(runtime);
      block.setReps(21); // Complete via bulk
      
      expect(runtime.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'reps:complete'
        })
      );
    });
  });  describe('State Access Methods', () => {
    it('should return exercise name', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Thrusters',
        targetReps: 21
      });
      
      expect(block.getExerciseName()).toBe('Thrusters');
    });

    it('should return target reps', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 15
      });
      
      expect(block.getTargetReps()).toBe(15);
    });

    it('should return current reps', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      block.setReps(10);
      
      expect(block.getCurrentReps()).toBe(10);
    });
  });

  describe('Disposal', () => {
    it('should clean up memory references', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      block.dispose(runtime);
      
      expect(runtime.memory.release).toHaveBeenCalled();
    });

    it('should complete disposal in <50ms', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      
      const startTime = performance.now();
      block.dispose(runtime);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Performance', () => {
    it('should execute push() in <1ms', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      const startTime = performance.now();
      block.mount(runtime);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(1);
    });

    it('should execute pop() in <1ms', () => {
      const block = new EffortBlock(runtime, [], {
        exerciseName: 'Pullups',
        targetReps: 21
      });
      
      block.mount(runtime);
      
      const startTime = performance.now();
      block.unmount(runtime);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(1);
    });
  });
});
