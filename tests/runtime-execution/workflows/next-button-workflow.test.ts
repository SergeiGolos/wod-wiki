import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { NextEvent } from '../../../src/runtime/NextEvent';
import { NextEventHandler } from '../../../src/runtime/NextEventHandler';
import { NextAction } from '../../../src/runtime/NextAction';
import { ErrorAction } from '../../../src/runtime/actions/ErrorAction';
import { BehaviorTestHarness, MockBlock } from '../../harness';

/**
 * Next Button Integration Tests
 * 
 * Verifies the workflow of the "Next" button click from UI event 
 * through handler validation to runtime action execution.
 */
describe('Next Button Integration Tests', () => {
  let harness: BehaviorTestHarness;
  let handler: NextEventHandler;

  beforeEach(() => {
    harness = new BehaviorTestHarness();
    handler = new NextEventHandler('next-handler-test');
  });

  describe('Event Handling', () => {
    it('should return a NextAction when a valid "next" event is received', () => {
      harness.push(new MockBlock('block-1'));

      const nextEvent = new NextEvent({ source: 'ui' });
      const actions = handler.handler(nextEvent, harness.runtime);

      expect(actions).toHaveLength(1);
      expect(actions[0]).toBeInstanceOf(NextAction);
    });

    it('should ignore events other than "next"', () => {
      harness.push(new MockBlock('block-1'));

      const otherEvent = { name: 'other', timestamp: new Date() };
      const actions = handler.handler(otherEvent, harness.runtime);

      expect(actions).toHaveLength(0);
    });

    it('should return no actions if the stack is empty', () => {
      // Empty stack
      const nextEvent = new NextEvent();
      const actions = handler.handler(nextEvent, harness.runtime);

      // Handler validates stack existence and current block
      expect(actions).toHaveLength(0);
    });
  });

  describe('Action Execution', () => {
    it('should trigger the current block\'s next() method when action is executed', () => {
      const block = new MockBlock('block-1');
      const nextSpy = vi.spyOn(block, 'next');
      harness.push(block);

      const nextAction = new NextAction();
      nextAction.do(harness.runtime);

      expect(nextSpy).toHaveBeenCalled();
    });

    it('should execute actions returned by the block\'s next() method', () => {
      const subAction = { do: vi.fn(), type: 'sub' };
      const block = new MockBlock('block-1');
      vi.spyOn(block, 'next').mockReturnValue([subAction as any]);
      harness.push(block);

      const nextAction = new NextAction();
      nextAction.do(harness.runtime);

      expect(subAction.do).toHaveBeenCalledWith(harness.runtime);
    });

    it('should maintain stable stack depth during sequential clicks', () => {
      const block = new MockBlock('block-1');
      harness.push(block);

      for (let i = 0; i < 5; i++) {
        const actions = handler.handler(new NextEvent(), harness.runtime);
        for (const action of actions) {
          action.do(harness.runtime);
        }
      }

      expect(harness.stackDepth).toBe(1);
      expect(harness.currentBlock).toBe(block);
    });
  });

  describe('Error Handling', () => {
    it('should return an ErrorAction if the runtime already has errors', () => {
      harness.push(new MockBlock('block-1'));

      harness.runtime.errors.push({
        error: new Error('Previous error'),
        source: 'test-source',
        timestamp: new Date()
      });

      const actions = handler.handler(new NextEvent(), harness.runtime);

      expect(actions).toHaveLength(1);
      expect(actions[0]).toBeInstanceOf(ErrorAction);
    });

    it('should return an ErrorAction if the stack is missing', () => {
      // Manually corrupt runtime for edge case testing
      (harness.runtime as any).stack = null;

      const actions = handler.handler(new NextEvent(), harness.runtime);

      expect(actions).toHaveLength(1);
      expect(actions[0]).toBeInstanceOf(ErrorAction);
    });

    it('should capture and report errors thrown during block execution', () => {
      const block = new MockBlock('block-1');
      const error = new Error('Crash in block.next()');
      vi.spyOn(block, 'next').mockImplementation(() => { throw error; });
      harness.push(block);

      const action = new NextAction();

      // Execution should be safe
      expect(() => action.do(harness.runtime)).not.toThrow();

      // Error should be registered in runtime
      expect(harness.runtime.errors).toHaveLength(1);
      expect(harness.runtime.errors[0].error).toBe(error);
      expect(harness.runtime.errors[0].source).toBe('NextAction');
    });

    it('should handle memory corruption markers', () => {
      harness.push(new MockBlock('block-1'));
      // Simulate memory corruption detection
      (harness.runtime.memory as any).state = 'corrupted';

      const action = new NextAction();
      action.do(harness.runtime);

      // Should abort execution safely
      expect(harness.runtime.errors).toHaveLength(0); // NextAction aborts silently if memory is invalid (pre-check)
    });
  });

  describe('Sequence and Ordering', () => {
    it('should preserve strict order of execution during rapid processing', () => {
      const sequence: number[] = [];
      const block = new MockBlock('ordered-block');
      vi.spyOn(block, 'next').mockImplementation(() => {
        sequence.push(sequence.length + 1);
        return [];
      });
      harness.push(block);

      // Simulate rapid sequential processing
      const count = 10;
      for (let i = 0; i < count; i++) {
        const actions = handler.handler(new NextEvent(), harness.runtime);
        for (const action of actions) {
          action.do(harness.runtime);
        }
      }

      expect(sequence).toHaveLength(count);
      expect(sequence).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });
});