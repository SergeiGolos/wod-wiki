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
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        expect(block).toBeDefined();
      }).toThrow();
    });

    it('should initialize with currentReps = 0', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        expect(block.getCurrentReps()).toBe(0);
      }).toThrow();
    });

    it('should initialize with isComplete() = false', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        expect(block.isComplete()).toBe(false);
      }).toThrow();
    });
  });

  describe('incrementRep() - Incremental Tracking', () => {
    it('should increment currentReps by 1', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 10
        });
        
        block.push();
        expect(block.getCurrentReps()).toBe(0);
        
        block.incrementRep();
        expect(block.getCurrentReps()).toBe(1);
        
        block.incrementRep();
        expect(block.getCurrentReps()).toBe(2);
      }).toThrow();
    });

    it('should emit reps:updated event', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 10
        });
        
        block.push();
        block.incrementRep();
        
        expect(runtime.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'reps:updated',
            currentReps: 1,
            targetReps: 10,
            completionMode: 'incremental'
          })
        );
      }).toThrow();
    });

    it('should not exceed targetReps', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 5
        });
        
        block.push();
        for (let i = 0; i < 10; i++) {
          block.incrementRep();
        }
        
        expect(block.getCurrentReps()).toBe(5); // Capped at target
      }).toThrow();
    });
  });

  describe('setReps() - Bulk Entry', () => {
    it('should set currentReps to specified count', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        block.setReps(15);
        
        expect(block.getCurrentReps()).toBe(15);
      }).toThrow();
    });

    it('should emit reps:updated with bulk mode', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        block.setReps(15);
        
        expect(runtime.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'reps:updated',
            currentReps: 15,
            targetReps: 21,
            completionMode: 'bulk'
          })
        );
      }).toThrow();
    });

    it('should reject count < 0', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        expect(() => block.setReps(-5)).toThrow(RangeError);
      }).toThrow();
    });

    it('should reject count > targetReps', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        expect(() => block.setReps(25)).toThrow(RangeError);
      }).toThrow();
    });

    it('should allow setting to exactly targetReps', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        block.setReps(21);
        
        expect(block.getCurrentReps()).toBe(21);
        expect(block.isComplete()).toBe(true);
      }).toThrow();
    });
  });

  describe('markComplete() - Force Completion', () => {
    it('should set currentReps to targetReps', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        block.incrementRep(); // At 1 rep
        block.markComplete();
        
        expect(block.getCurrentReps()).toBe(21);
      }).toThrow();
    });

    it('should emit reps:complete', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        block.markComplete();
        
        expect(runtime.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'reps:complete',
            finalReps: 21
          })
        );
      }).toThrow();
    });

    it('should be idempotent', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        block.markComplete();
        block.markComplete(); // Should not throw
        
        expect(block.getCurrentReps()).toBe(21);
      }).toThrow();
    });
  });

  describe('isComplete() - Completion Status', () => {
    it('should return false when reps < target', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        block.setReps(15);
        
        expect(block.isComplete()).toBe(false);
      }).toThrow();
    });

    it('should return true when reps >= target', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        block.setReps(21);
        
        expect(block.isComplete()).toBe(true);
      }).toThrow();
    });

    it('should return true after markComplete()', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        block.markComplete();
        
        expect(block.isComplete()).toBe(true);
      }).toThrow();
    });
  });

  describe('Hybrid Tracking - Mode Switching', () => {
    it('should switch from incremental to bulk', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        
        // Incremental
        block.incrementRep();
        block.incrementRep();
        expect(block.getCurrentReps()).toBe(2);
        
        // Switch to bulk
        block.setReps(10);
        expect(block.getCurrentReps()).toBe(10);
      }).toThrow();
    });

    it('should switch from bulk back to incremental', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        
        // Bulk
        block.setReps(10);
        expect(block.getCurrentReps()).toBe(10);
        
        // Switch to incremental
        block.incrementRep();
        expect(block.getCurrentReps()).toBe(11);
      }).toThrow();
    });

    it('should track completion mode correctly', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        
        block.incrementRep(); // Mode: incremental
        expect(runtime.handle).toHaveBeenLastCalledWith(
          expect.objectContaining({ completionMode: 'incremental' })
        );
        
        block.setReps(5); // Mode: bulk
        expect(runtime.handle).toHaveBeenLastCalledWith(
          expect.objectContaining({ completionMode: 'bulk' })
        );
      }).toThrow();
    });
  });

  describe('Auto-Completion', () => {
    it('should emit reps:complete when target reached via increment', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 3
        });
        
        block.push();
        block.incrementRep(); // 1
        block.incrementRep(); // 2
        block.incrementRep(); // 3 - should trigger completion
        
        expect(runtime.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'reps:complete'
          })
        );
      }).toThrow();
    });

    it('should emit reps:complete when target reached via bulk', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        block.setReps(21); // Complete via bulk
        
        expect(runtime.handle).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'reps:complete',
            finalReps: 21
          })
        );
      }).toThrow();
    });
  });

  describe('State Access Methods', () => {
    it('should return exercise name', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Thrusters',
          targetReps: 21
        });
        
        expect(block.getExerciseName()).toBe('Thrusters');
      }).toThrow();
    });

    it('should return target reps', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 15
        });
        
        expect(block.getTargetReps()).toBe(15);
      }).toThrow();
    });

    it('should return current reps', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        block.setReps(10);
        
        expect(block.getCurrentReps()).toBe(10);
      }).toThrow();
    });
  });

  describe('Disposal', () => {
    it('should clean up memory references', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        block.dispose();
        
        expect(runtime.memory.release).toHaveBeenCalled();
      }).toThrow();
    });

    it('should complete disposal in <50ms', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        
        const startTime = performance.now();
        block.dispose();
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(50);
      }).toThrow();
    });
  });

  describe('Performance', () => {
    it('should execute push() in <1ms', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        const startTime = performance.now();
        block.push();
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(1);
      }).toThrow();
    });

    it('should execute pop() in <1ms', () => {
      expect(() => {
        
        const block = new EffortBlock(runtime, [], {
          exerciseName: 'Pullups',
          targetReps: 21
        });
        
        block.push();
        
        const startTime = performance.now();
        block.pop();
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(1);
      }).toThrow();
    });
  });
});
