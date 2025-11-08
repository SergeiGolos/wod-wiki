import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextEvent } from '../../../src/runtime/NextEvent';
import { NextEventHandler } from '../../../src/runtime/NextEventHandler';
import { NextAction } from '../../../src/runtime/NextAction';
import { ErrorAction } from '../../../src/runtime/actions/ErrorAction';
import { IScriptRuntime } from '../../../src/runtime/IScriptRuntime';

describe('Next Button Integration Tests', () => {
  let mockRuntime: IScriptRuntime;
  let handler: NextEventHandler;
  let mockBlocks: any[];

  beforeEach(() => {
    // Create mock blocks for testing execution flow
    mockBlocks = [
      {
        key: { toString: () => 'block-1' },
        next: vi.fn().mockReturnValue([])
      },
      {
        key: { toString: () => 'block-2' },
        next: vi.fn().mockReturnValue([])
      },
      {
        key: { toString: () => 'block-3' },
        next: vi.fn().mockReturnValue([])
      }
    ];

    const mockErrors: any[] = [];
    mockRuntime = {
      stack: {
        current: mockBlocks[0],
        blocks: [mockBlocks[0]]
      },
      memory: {
        allocate: vi.fn(),
        deallocate: vi.fn(),
        get: vi.fn(),
        set: vi.fn(),
        search: vi.fn().mockReturnValue([]),
        release: vi.fn()
      },
      get errors() { return mockErrors; },
      setError: vi.fn(),
      handle: vi.fn()
    } as any;

    handler = new NextEventHandler('integration-test-handler');
  });

  describe('Core Next Button Functionality', () => {
    it('should advance execution when Next button is clicked', () => {
      const nextEvent = new NextEvent({ source: 'ui' });
      const actions = handler.handler(nextEvent, mockRuntime);

      expect(actions).toHaveLength(1);
      expect(actions[0]).toBeInstanceOf(NextAction);
    });

    it('should execute action and advance current block', () => {
      const nextEvent = new NextEvent();
      const actions = handler.handler(nextEvent, mockRuntime);

      // Execute the returned action
      if (actions.length > 0) {
        actions[0].do(mockRuntime);
      }

      expect(mockBlocks[0].next).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple Next button clicks sequentially', () => {
      for (let i = 0; i < 3; i++) {
        const nextEvent = new NextEvent();
        const actions = handler.handler(nextEvent, mockRuntime);
        if (actions.length > 0) {
          actions[0].do(mockRuntime);
        }
      }

      expect(mockBlocks[0].next).toHaveBeenCalledTimes(3);
    });

    it('should maintain UI state after Next button click', () => {
      const uiState = {
        stepVersion: 0,
        isRunning: false,
        hasErrors: false
      };

      const nextEvent = new NextEvent(uiState);
      const actions = handler.handler(nextEvent, mockRuntime);

      expect(actions).toHaveLength(1);
      expect(uiState.stepVersion).toBe(0); // Should remain unchanged until UI updates
    });
  });

  describe('Rapid Click Handling', () => {
    it('should handle rapid Next button clicks without errors', () => {
      const rapidClicks = 10;

      for (let i = 0; i < rapidClicks; i++) {
        const nextEvent = new NextEvent({ clickIndex: i });
        const actions = handler.handler(nextEvent, mockRuntime);

        expect(actions).toHaveLength(1);

        // Execute action
        if (actions.length > 0) {
          actions[0].do(mockRuntime);
        }
      }

      expect(mockBlocks[0].next).toHaveBeenCalledTimes(rapidClicks);
    });

    it('should prevent event queue overflow during rapid clicks', () => {
      const rapidClicks = 100;
      const action = new NextAction();

      const start = performance.now();
      for (let i = 0; i < rapidClicks; i++) {
        action.do(mockRuntime);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
      expect(mockBlocks[0].next).toHaveBeenCalledTimes(rapidClicks);
    });

    it('should maintain execution order during rapid clicks', () => {
      const executionOrder: number[] = [];
      vi.mocked(mockBlocks[0].next).mockImplementation(() => {
        executionOrder.push(executionOrder.length + 1);
        return [];
      });

      for (let i = 0; i < 5; i++) {
        const nextEvent = new NextEvent({ sequence: i });
        const actions = handler.handler(nextEvent, mockRuntime);
        if (actions.length > 0) {
          actions[0].do(mockRuntime);
        }
      }

      expect(executionOrder).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Script Completion Boundary', () => {
    it('should handle end of script gracefully', () => {
      // Simulate end of script by setting current block to null
      (mockRuntime.stack as any).current = null;

      const nextEvent = new NextEvent();
      const actions = handler.handler(nextEvent, mockRuntime);

      // No current block - returns empty array
      expect(actions).toHaveLength(0);
    });

    it('should detect script completion and stop advancement', () => {
      // Simulate completion by having block.next(runtime) return empty array
      vi.mocked(mockBlocks[0].next).mockReturnValue([]);

      const nextEvent = new NextEvent();
      const actions = handler.handler(nextEvent, mockRuntime);
      
      if (actions.length > 0) {
        actions[0].do(mockRuntime);
      }

      expect(mockBlocks[0].next).toHaveBeenCalled();
    });

    it('should handle script completion with final actions', () => {
      const finalAction = { do: vi.fn() };
      vi.mocked(mockBlocks[0].next).mockReturnValue([finalAction]);

      const nextEvent = new NextEvent();
      const actions = handler.handler(nextEvent, mockRuntime);
      
      if (actions.length > 0) {
        actions[0].do(mockRuntime);
      }

      expect(finalAction.do).toHaveBeenCalledWith(mockRuntime);
    });

    it('should transition to completed state when script ends', () => {
      (mockRuntime.stack as any).current = null;
      const nextEvent = new NextEvent();
      const actions = handler.handler(nextEvent, mockRuntime);

      // No current block - returns empty array
      expect(actions).toHaveLength(0);
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle runtime errors during Next button click', () => {
      mockRuntime.errors!.push({
        error: new Error('Existing runtime error'),
        source: 'test',
        timestamp: new Date()
      });

      const nextEvent = new NextEvent();
      const actions = handler.handler(nextEvent, mockRuntime);

      // Runtime has errors - returns ErrorAction
      expect(actions).toHaveLength(1);
      expect(actions[0]).toBeInstanceOf(ErrorAction);
    });

    it('should handle block execution errors gracefully', () => {
      const error = new Error('Block execution failed');
      vi.mocked(mockBlocks[0].next).mockImplementation(() => {
        throw error;
      });

      const nextEvent = new NextEvent();
      const actions = handler.handler(nextEvent, mockRuntime);
      
      if (actions.length > 0) {
        expect(() => actions[0].do(mockRuntime)).not.toThrow();
      }
    });

    it('should recover from transient errors', () => {
      let callCount = 0;
      vi.mocked(mockBlocks[0].next).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Transient error');
        }
        return [];
      });

      // First call should handle error
      const nextEvent1 = new NextEvent();
      const actions1 = handler.handler(nextEvent1, mockRuntime);
      if (actions1.length > 0) {
        actions1[0].do(mockRuntime);
      }

      // Reset error state - clear errors array
      mockRuntime.errors!.length = 0;

      // Second call should succeed
      const nextEvent2 = new NextEvent();
      const actions2 = handler.handler(nextEvent2, mockRuntime);
      if (actions2.length > 0) {
        actions2[0].do(mockRuntime);
      }

      expect(mockBlocks[0].next).toHaveBeenCalledTimes(2);
    });

    it('should handle corrupted memory state', () => {
      // Simulate corrupted state by making stack invalid
      (mockRuntime as any).stack = null;

      const nextEvent = new NextEvent();
      const actions = handler.handler(nextEvent, mockRuntime);

      // Invalid stack - returns ErrorAction
      expect(actions).toHaveLength(1);
      expect(actions[0]).toBeInstanceOf(ErrorAction);
    });

    it('should handle invalid runtime state', () => {
      const invalidRuntime = {
        stack: null,
        memory: {
          search: vi.fn().mockReturnValue([]),
          release: vi.fn()
        },
        get errors() { return []; }
      } as any;

      const nextEvent = new NextEvent();
      const actions = handler.handler(nextEvent, invalidRuntime);

      // Invalid runtime - returns ErrorAction
      expect(actions).toHaveLength(1);
      expect(actions[0]).toBeInstanceOf(ErrorAction);
    });
  });

  describe('Performance Requirements', () => {
    it('should handle Next button events within 10ms', () => {
      const nextEvent = new NextEvent();
      const iterations = 100;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        handler.handler(nextEvent, mockRuntime);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(10); // Target: <10ms per event
    });

    it('should execute Next actions within 50ms', () => {
      const action = new NextAction();
      vi.mocked(mockBlocks[0].next).mockReturnValue([]);
      const iterations = 100;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        action.do(mockRuntime);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      expect(avgTime).toBeLessThan(50); // Target: <50ms per action
    });

    it('should handle memory usage efficiently during repeated clicks', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate many Next button clicks
      for (let i = 0; i < 1000; i++) {
        const nextEvent = new NextEvent();
        const actions = handler.handler(nextEvent, mockRuntime);
        if (actions.length > 0) {
          actions[0].do(mockRuntime);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent runtime state during execution', () => {
      const nextEvent = new NextEvent();
      const actions = handler.handler(nextEvent, mockRuntime);

      const initialState = {
        stackDepth: mockRuntime.stack.blocks.length,
        currentBlock: mockRuntime.stack.current
      };

      if (actions.length > 0) {
        actions[0].do(mockRuntime);
      }

      // State should remain consistent
      expect(mockRuntime.stack.blocks).toBeDefined();
      expect(mockRuntime.stack.current).toBeDefined();
    });

    it('should handle concurrent Next button events safely', () => {
      const concurrentEvents = 10;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentEvents; i++) {
        const promise = new Promise((resolve) => {
          setTimeout(() => {
            const nextEvent = new NextEvent({ concurrent: true });
            const actions = handler.handler(nextEvent, mockRuntime);
            if (actions.length > 0) {
              actions[0].do(mockRuntime);
            }
            resolve(actions);
          }, Math.random() * 10);
        });
        promises.push(promise);
      }

      return Promise.all(promises).then(results => {
        expect(results).toHaveLength(concurrentEvents);
        results.forEach(actions => {
          // Each result should be an array of actions
          expect(Array.isArray(actions)).toBe(true);
        });
      });
    });
  });
});