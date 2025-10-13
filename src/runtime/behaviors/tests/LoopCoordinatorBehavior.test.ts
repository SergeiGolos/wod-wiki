/**
 * LoopCoordinatorBehavior Tests
 * 
 * Tests for the unified loop coordinator behavior.
 */

import { describe, it, expect, vi } from 'vitest';
import { LoopCoordinatorBehavior, LoopType, LoopConfig } from '../LoopCoordinatorBehavior';

describe('LoopCoordinatorBehavior', () => {
  describe('Configuration Validation', () => {
    it('should throw if childGroups is empty', () => {
      const config: LoopConfig = {
        childGroups: [],
        loopType: LoopType.FIXED,
        totalRounds: 3,
      };

      expect(() => new LoopCoordinatorBehavior(config)).toThrow(
        'childGroups must not be empty'
      );
    });

    it('should throw if totalRounds < 1 for fixed loop type', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any]],
        loopType: LoopType.FIXED,
        totalRounds: 0,
      };

      expect(() => new LoopCoordinatorBehavior(config)).toThrow(
        'totalRounds must be >= 1'
      );
    });

    it('should throw if repScheme is missing for repScheme loop type', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any]],
        loopType: LoopType.REP_SCHEME,
        totalRounds: 3,
      };

      expect(() => new LoopCoordinatorBehavior(config)).toThrow(
        'repScheme must be provided'
      );
    });

    it('should throw if repScheme length does not match totalRounds', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any]],
        loopType: LoopType.REP_SCHEME,
        totalRounds: 3,
        repScheme: [21, 15], // Only 2 values for 3 rounds
      };

      expect(() => new LoopCoordinatorBehavior(config)).toThrow(
        'repScheme length (2) must match totalRounds (3)'
      );
    });

    it('should throw if repScheme contains non-positive value', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any]],
        loopType: LoopType.REP_SCHEME,
        totalRounds: 3,
        repScheme: [21, 0, 9], // Zero is invalid
      };

      expect(() => new LoopCoordinatorBehavior(config)).toThrow(
        'repScheme[1] must be > 0'
      );
    });

    it('should throw if intervalDurationMs is missing for interval loop type', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any]],
        loopType: LoopType.INTERVAL,
        totalRounds: 30,
      };

      expect(() => new LoopCoordinatorBehavior(config)).toThrow(
        'intervalDurationMs must be > 0'
      );
    });
  });

  describe('Loop State Calculations', () => {
    it('should initialize with index=-1 (pre-first-advance state)', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any], [{} as any]],
        loopType: LoopType.FIXED,
        totalRounds: 3,
      };

      const behavior = new LoopCoordinatorBehavior(config);
      const state = behavior.getState();

      expect(state.index).toBe(-1);
      expect(state.position).toBe(-1 % 2); // -1 in JavaScript
      expect(state.rounds).toBe(Math.floor(-1 / 2)); // -1
    });

    it('should calculate position using modulo arithmetic', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any], [{} as any]], // 2 child groups
        loopType: LoopType.FIXED,
        totalRounds: 3,
      };

      const behavior = new LoopCoordinatorBehavior(config);

      // Simulate state at different indices
      const testCases = [
        { index: 0, expectedPosition: 0, expectedRounds: 0 },
        { index: 1, expectedPosition: 1, expectedRounds: 0 },
        { index: 2, expectedPosition: 0, expectedRounds: 1 }, // Round wrap
        { index: 3, expectedPosition: 1, expectedRounds: 1 },
        { index: 4, expectedPosition: 0, expectedRounds: 2 }, // Round wrap
        { index: 5, expectedPosition: 1, expectedRounds: 2 },
      ];

      for (const testCase of testCases) {
        // Access private index field for testing
        (behavior as any).index = testCase.index;
        const state = behavior.getState();

        expect(state.index).toBe(testCase.index);
        expect(state.position).toBe(testCase.expectedPosition);
        expect(state.rounds).toBe(testCase.expectedRounds);
      }
    });

    it('should handle single child group (position always 0)', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any]], // 1 child group
        loopType: LoopType.FIXED,
        totalRounds: 5,
      };

      const behavior = new LoopCoordinatorBehavior(config);

      // Simulate state at different indices
      for (let index = 0; index < 10; index++) {
        (behavior as any).index = index;
        const state = behavior.getState();

        expect(state.position).toBe(0); // Always 0 for single child
        expect(state.rounds).toBe(index); // Rounds = index when 1 child
      }
    });

    it('should handle 3 child groups', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any], [{} as any], [{} as any]], // 3 child groups
        loopType: LoopType.FIXED,
        totalRounds: 2,
      };

      const behavior = new LoopCoordinatorBehavior(config);

      // Simulate state progression
      const testCases = [
        { index: 0, expectedPosition: 0, expectedRounds: 0 },
        { index: 1, expectedPosition: 1, expectedRounds: 0 },
        { index: 2, expectedPosition: 2, expectedRounds: 0 },
        { index: 3, expectedPosition: 0, expectedRounds: 1 }, // Round wrap
        { index: 4, expectedPosition: 1, expectedRounds: 1 },
        { index: 5, expectedPosition: 2, expectedRounds: 1 },
        { index: 6, expectedPosition: 0, expectedRounds: 2 }, // Round wrap
      ];

      for (const testCase of testCases) {
        (behavior as any).index = testCase.index;
        const state = behavior.getState();

        expect(state.position).toBe(testCase.expectedPosition);
        expect(state.rounds).toBe(testCase.expectedRounds);
      }
    });
  });

  describe('Fixed Rounds Loop Logic', () => {
    it('should complete after specified rounds', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any], [{} as any]], // 2 child groups
        loopType: LoopType.FIXED,
        totalRounds: 3,
      };

      const behavior = new LoopCoordinatorBehavior(config);
      const mockRuntime = {} as any;

      // Before completion
      (behavior as any).index = 4; // rounds = 2 (not complete yet)
      expect(behavior.isComplete(mockRuntime)).toBe(false);

      // At completion
      (behavior as any).index = 6; // rounds = 3 (complete)
      expect(behavior.isComplete(mockRuntime)).toBe(true);

      // After completion
      (behavior as any).index = 8; // rounds = 4 (still complete)
      expect(behavior.isComplete(mockRuntime)).toBe(true);
    });
  });

  describe('Rep Scheme Loop Logic', () => {
    it('should return correct reps for current round', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any], [{} as any]], // 2 child groups (Thrusters, Pullups)
        loopType: LoopType.REP_SCHEME,
        totalRounds: 3,
        repScheme: [21, 15, 9], // Fran rep scheme
      };

      const behavior = new LoopCoordinatorBehavior(config);

      // Round 0: 21 reps
      (behavior as any).index = 0;
      expect(behavior.getRepsForCurrentRound()).toBe(21);

      (behavior as any).index = 1;
      expect(behavior.getRepsForCurrentRound()).toBe(21);

      // Round 1: 15 reps
      (behavior as any).index = 2;
      expect(behavior.getRepsForCurrentRound()).toBe(15);

      (behavior as any).index = 3;
      expect(behavior.getRepsForCurrentRound()).toBe(15);

      // Round 2: 9 reps
      (behavior as any).index = 4;
      expect(behavior.getRepsForCurrentRound()).toBe(9);

      (behavior as any).index = 5;
      expect(behavior.getRepsForCurrentRound()).toBe(9);
    });

    it('should complete after all rep scheme rounds', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any], [{} as any]],
        loopType: LoopType.REP_SCHEME,
        totalRounds: 3,
        repScheme: [21, 15, 9],
      };

      const behavior = new LoopCoordinatorBehavior(config);
      const mockRuntime = {} as any;

      // Round 2 (last round)
      (behavior as any).index = 5; // rounds = 2 (not complete yet)
      expect(behavior.isComplete(mockRuntime)).toBe(false);

      // After round 2
      (behavior as any).index = 6; // rounds = 3 (complete)
      expect(behavior.isComplete(mockRuntime)).toBe(true);
    });

    it('should return undefined for non-repScheme loop types', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any], [{} as any]],
        loopType: LoopType.FIXED,
        totalRounds: 3,
      };

      const behavior = new LoopCoordinatorBehavior(config);
      expect(behavior.getRepsForCurrentRound()).toBeUndefined();
    });
  });

  describe('Completed Rounds Tracking', () => {
    it('should return correct completed rounds count', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any], [{} as any]],
        loopType: LoopType.TIME_BOUND, // AMRAP
      };

      const behavior = new LoopCoordinatorBehavior(config);

      // Simulate AMRAP progression
      (behavior as any).index = 0;
      expect(behavior.getCompletedRounds()).toBe(0);

      (behavior as any).index = 1;
      expect(behavior.getCompletedRounds()).toBe(0);

      (behavior as any).index = 2; // Round wrap
      expect(behavior.getCompletedRounds()).toBe(1);

      (behavior as any).index = 10;
      expect(behavior.getCompletedRounds()).toBe(5);

      (behavior as any).index = 99;
      expect(behavior.getCompletedRounds()).toBe(49);
    });
  });

  describe('onNext() Behavior', () => {
    it('should return empty array if already complete', () => {
      const mockChild = { id: 1 } as any;
      const config: LoopConfig = {
        childGroups: [[mockChild], [mockChild]],
        loopType: LoopType.FIXED,
        totalRounds: 3,
      };

      const behavior = new LoopCoordinatorBehavior(config);
      const mockRuntime = {
        jit: {
          compile: vi.fn().mockReturnValue({ key: 'mock-block' }),
        },
      } as any;

      // Set to completed state
      (behavior as any).index = 6; // rounds = 3 (complete)

      const actions = behavior.onNext(mockRuntime, {} as any);
      expect(actions).toEqual([]);
      expect(mockRuntime.jit.compile).not.toHaveBeenCalled();
    });

    it('should compile and push child at current position', () => {
      const child1 = { id: 1 } as any;
      const child2 = { id: 2 } as any;
      const mockCompiledBlock = { key: 'mock-block-1' } as any;

      const config: LoopConfig = {
        childGroups: [[child1], [child2]],
        loopType: LoopType.FIXED,
        totalRounds: 3,
      };

      const behavior = new LoopCoordinatorBehavior(config);
      const mockRuntime = {
        jit: {
          compile: vi.fn().mockReturnValue(mockCompiledBlock),
        },
      } as any;

      // First call: position 0
      const actions1 = behavior.onNext(mockRuntime, {} as any);
      expect(actions1).toHaveLength(1);
      expect(actions1[0].type).toBe('push-block');
      expect((actions1[0] as any).block).toBe(mockCompiledBlock);
      // Now includes context parameter
      expect(mockRuntime.jit.compile).toHaveBeenCalledWith(
        [child1],
        mockRuntime,
        expect.objectContaining({ round: 1, totalRounds: 3, position: 0 })
      );

      // Second call: position 1
      const actions2 = behavior.onNext(mockRuntime, {} as any);
      expect(actions2).toHaveLength(1);
      expect(mockRuntime.jit.compile).toHaveBeenCalledWith(
        [child2],
        mockRuntime,
        expect.objectContaining({ round: 1, totalRounds: 3, position: 1 })
      );
    });

    it('should loop back to first child after completing round', () => {
      const child1 = { id: 1 } as any;
      const child2 = { id: 2 } as any;
      const mockCompiledBlock = { key: 'mock-block' } as any;

      const config: LoopConfig = {
        childGroups: [[child1], [child2]],
        loopType: LoopType.FIXED,
        totalRounds: 2, // Change to 2 rounds for simpler test
      };

      const behavior = new LoopCoordinatorBehavior(config);
      const mockRuntime = {
        jit: {
          compile: vi.fn().mockReturnValue(mockCompiledBlock),
        },
      } as any;

      // Advance through 4 calls (2 rounds × 2 children)
      // Calls: index 0→1→2→3, position 0→1→0→1, rounds 0→0→1→1
      for (let i = 0; i < 4; i++) {
        const actions = behavior.onNext(mockRuntime, {} as any);
        
        expect(actions).toHaveLength(1);
        
        // Check which child was compiled based on position
        const expectedChild = i % 2 === 0 ? child1 : child2;
        const expectedRound = i < 2 ? 1 : 2; // Round 1 for first 2 calls, round 2 for next 2
        const expectedPosition = i % 2;
        
        expect(mockRuntime.jit.compile).toHaveBeenLastCalledWith(
          [expectedChild],
          mockRuntime,
          expect.objectContaining({ 
            round: expectedRound, 
            totalRounds: 2, 
            position: expectedPosition 
          })
        );
      }

      // After 4 calls, index=3, rounds=floor(3/2)=1 (not complete yet)
      let state = behavior.getState();
      expect(state.rounds).toBe(1);
      expect(state.index).toBe(3);

      // 5th call: will increment to index=4, rounds=floor(4/2)=2, then check complete (rounds >= 2), return []
      const actions5 = behavior.onNext(mockRuntime, {} as any);
      expect(actions5).toEqual([]);

      // Verify completion state - index DOES increment before checking completion
      state = behavior.getState();
      expect(state.index).toBe(4); // Index increments to 4
      expect(state.rounds).toBe(2); // rounds = 2, which triggers completion
    });
  });

  describe('onPush() Behavior', () => {
    it('should immediately compile and push first child', () => {
      const child1 = { id: 1 } as any;
      const child2 = { id: 2 } as any;
      const mockCompiledBlock = { key: 'mock-block-1' } as any;

      const config: LoopConfig = {
        childGroups: [[child1], [child2]],
        loopType: LoopType.FIXED,
        totalRounds: 3,
      };

      const behavior = new LoopCoordinatorBehavior(config);
      const mockRuntime = {
        jit: {
          compile: vi.fn().mockReturnValue(mockCompiledBlock),
        },
      } as any;

      // onPush should immediately compile first child
      const actions = behavior.onPush(mockRuntime, {} as any);
      
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('push-block');
      expect((actions[0] as any).block).toBe(mockCompiledBlock);
      // Now includes context parameter
      expect(mockRuntime.jit.compile).toHaveBeenCalledWith(
        [child1],
        mockRuntime,
        expect.objectContaining({ round: 1, totalRounds: 3, position: 0 })
      );

      // Verify state advanced to index 0
      const state = behavior.getState();
      expect(state.index).toBe(0);
    });
  });

  describe('Compilation Context', () => {
    it('should create context with round and totalRounds for fixed loop', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any], [{} as any]],
        loopType: LoopType.FIXED,
        totalRounds: 3,
      };

      const behavior = new LoopCoordinatorBehavior(config);

      // Simulate different states
      (behavior as any).index = 0; // round 0
      let context = behavior.getCompilationContext();
      expect(context.round).toBe(1); // 1-indexed
      expect(context.totalRounds).toBe(3);
      expect(context.position).toBe(0);
      expect(context.reps).toBeUndefined(); // No rep scheme

      (behavior as any).index = 2; // round 1
      context = behavior.getCompilationContext();
      expect(context.round).toBe(2); // 1-indexed
      expect(context.totalRounds).toBe(3);
      expect(context.position).toBe(0);
    });

    it('should include reps in context for rep scheme loop', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any], [{} as any]],
        loopType: LoopType.REP_SCHEME,
        totalRounds: 3,
        repScheme: [21, 15, 9],
      };

      const behavior = new LoopCoordinatorBehavior(config);

      // Round 0: 21 reps
      (behavior as any).index = 0;
      let context = behavior.getCompilationContext();
      expect(context.round).toBe(1);
      expect(context.reps).toBe(21);

      // Round 1: 15 reps
      (behavior as any).index = 2;
      context = behavior.getCompilationContext();
      expect(context.round).toBe(2);
      expect(context.reps).toBe(15);

      // Round 2: 9 reps
      (behavior as any).index = 4;
      context = behavior.getCompilationContext();
      expect(context.round).toBe(3);
      expect(context.reps).toBe(9);
    });

    it('should include intervalDurationMs in context for interval loop', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any]],
        loopType: LoopType.INTERVAL,
        totalRounds: 30,
        intervalDurationMs: 60000, // 60 seconds
      };

      const behavior = new LoopCoordinatorBehavior(config);

      (behavior as any).index = 0;
      const context = behavior.getCompilationContext();
      expect(context.intervalDurationMs).toBe(60000);
      expect(context.totalRounds).toBe(30);
    });
  });
});
