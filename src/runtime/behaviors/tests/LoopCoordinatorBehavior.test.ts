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
      const mockCompiledBlock = { key: 'mock-block-1' } as any;

      const config: LoopConfig = {
        childGroups: [[1], [2]], // number[][] format (child IDs)
        loopType: LoopType.FIXED,
        totalRounds: 3,
      };

      const behavior = new LoopCoordinatorBehavior(config);
      const mockRuntime = {
        jit: {
          compile: vi.fn().mockReturnValue(mockCompiledBlock),
        },
        script: {
          getIds: vi.fn((ids: number[]) => ids.map(id => ({ id })))
        },
        memory: {
          search: vi.fn().mockReturnValue([]),
          get: vi.fn(),
          set: vi.fn(),
          allocate: vi.fn()
        }
      } as any;

      // Mock block with key for emitRoundChanged
      const mockBlock = { key: { toString: () => 'mock-block-key' } } as any;

      // First call: position 0
      const actions1 = behavior.onNext(mockRuntime, mockBlock);
      expect(actions1.length).toBeGreaterThanOrEqual(1); // May include SetRoundsDisplayAction
      const pushAction1 = actions1.find(a => a.type === 'push-block');
      expect(pushAction1).toBeDefined();
      expect((pushAction1 as any).block).toBe(mockCompiledBlock);

      // Context parameter removed - inheritance via public memory
      expect(mockRuntime.jit.compile).toHaveBeenCalledWith(
        [{ id: 1 }], // Resolved by getIds
        mockRuntime
      );

      // Second call: position 1
      const actions2 = behavior.onNext(mockRuntime, mockBlock);
      expect(actions2.length).toBeGreaterThanOrEqual(1);
      expect(mockRuntime.jit.compile).toHaveBeenCalledWith(
        [{ id: 2 }], // Resolved by getIds
        mockRuntime
      );
    });

    it('should loop back to first child after completing round', () => {
      const mockCompiledBlock = { key: 'mock-block' } as any;

      const config: LoopConfig = {
        childGroups: [[1], [2]], // number[][] format (child IDs)
        loopType: LoopType.FIXED,
        totalRounds: 2, // Change to 2 rounds for simpler test
      };

      const behavior = new LoopCoordinatorBehavior(config);
      const mockRuntime = {
        jit: {
          compile: vi.fn().mockReturnValue(mockCompiledBlock),
        },
        script: {
          getIds: vi.fn((ids: number[]) => ids.map(id => ({ id })))
        },
        memory: {
          search: vi.fn().mockReturnValue([]),
          get: vi.fn(),
          set: vi.fn(),
          allocate: vi.fn()
        }
      } as any;

      // Mock block with key for emitRoundChanged
      const mockBlock = { key: { toString: () => 'mock-block-key' } } as any;

      // Advance through 4 calls (2 rounds × 2 children)
      // Calls: index 0→1→2→3, position 0→1→0→1, rounds 0→0→1→1
      for (let i = 0; i < 4; i++) {
        const actions = behavior.onNext(mockRuntime, mockBlock);
        
        expect(actions.length).toBeGreaterThanOrEqual(1);
        const pushAction = actions.find(a => a.type === 'push-block');
        expect(pushAction).toBeDefined();
        
        // Check which child was compiled based on position
        const expectedChildId = i % 2 === 0 ? 1 : 2;
        
        // Context parameter removed - verify child ID only
        expect(mockRuntime.jit.compile).toHaveBeenLastCalledWith(
          [{ id: expectedChildId }], // Resolved by getIds
          mockRuntime
        );
      }

      // After 4 calls, index=3, rounds=floor(3/2)=1 (not complete yet)
      let state = behavior.getState();
      expect(state.rounds).toBe(1);
      expect(state.index).toBe(3);

      // 5th call: will increment to index=4, rounds=floor(4/2)=2, then check complete (rounds >= 2), return []
      const actions5 = behavior.onNext(mockRuntime, mockBlock);
      expect(actions5).toEqual([]);

      // Verify completion state - index DOES increment before checking completion
      state = behavior.getState();
      expect(state.index).toBe(4); // Index increments to 4
      expect(state.rounds).toBe(2); // rounds = 2, which triggers completion
    });
  });

  describe('onPush() Behavior', () => {
    it('should immediately compile and push first child', () => {
      const mockCompiledBlock = { key: 'mock-block-1' } as any;

      const config: LoopConfig = {
        childGroups: [[1], [2]], // number[][] format (child IDs)
        loopType: LoopType.FIXED,
        totalRounds: 3,
      };

      const behavior = new LoopCoordinatorBehavior(config);
      const mockRuntime = {
        jit: {
          compile: vi.fn().mockReturnValue(mockCompiledBlock),
        },
        script: {
          getIds: vi.fn((ids: number[]) => ids.map(id => ({ id })))
        },
        memory: {
          search: vi.fn().mockReturnValue([]),
          get: vi.fn(),
          set: vi.fn(),
          allocate: vi.fn()
        }
      } as any;

      // Mock block with key for emitRoundChanged
      const mockBlock = { key: { toString: () => 'mock-block-key' } } as any;

      // onPush should immediately compile first child
      const actions = behavior.onPush(mockRuntime, mockBlock);
      
      expect(actions.length).toBeGreaterThanOrEqual(1);
      const pushAction = actions.find(a => a.type === 'push-block');
      expect(pushAction).toBeDefined();
      expect((pushAction as any).block).toBe(mockCompiledBlock);
      // Context parameter removed - inheritance via public memory
      expect(mockRuntime.jit.compile).toHaveBeenCalledWith(
        [{ id: 1 }], // Resolved by getIds
        mockRuntime
      );

      // Verify state advanced to index 0
      const state = behavior.getState();
      expect(state.index).toBe(0);
    });
  });

  describe('Rep Scheme Access', () => {
    // NOTE: CompilationContext has been deprecated in favor of public memory references.
    // Parent blocks (like RoundsBlock) expose metrics via allocate(..., 'public'), 
    // and child strategies search memory for inherited values.
    // Tests for metric inheritance are in tests/integration/metric-inheritance/

    it('should provide round information via getRepsForCurrentRound for rep scheme loops', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any], [{} as any]],
        loopType: LoopType.REP_SCHEME,
        totalRounds: 3,
        repScheme: [21, 15, 9],
      };

      const behavior = new LoopCoordinatorBehavior(config);

      // Round 0: 21 reps
      (behavior as any).index = 0;
      expect(behavior.getRepsForCurrentRound()).toBe(21);

      // Round 1: 15 reps
      (behavior as any).index = 2;
      expect(behavior.getRepsForCurrentRound()).toBe(15);

      // Round 2: 9 reps
      (behavior as any).index = 4;
      expect(behavior.getRepsForCurrentRound()).toBe(9);
    });

    it('should return undefined for getRepsForCurrentRound when not a rep scheme loop', () => {
      const config: LoopConfig = {
        childGroups: [[{} as any], [{} as any]],
        loopType: LoopType.FIXED,
        totalRounds: 3,
      };

      const behavior = new LoopCoordinatorBehavior(config);
      expect(behavior.getRepsForCurrentRound()).toBeUndefined();
    });
  });
});
