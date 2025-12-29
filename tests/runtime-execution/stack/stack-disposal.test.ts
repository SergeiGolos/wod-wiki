import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { RuntimeStack } from '../../../src/runtime/RuntimeStack';
import { BehaviorTestHarness, MockBlock } from '../../harness';

/**
 * RuntimeStack Disposal & Edge Case Tests
 * 
 * Verifies that the stack correctly manages block lifecycle, 
 * handles disposal errors gracefully, and maintains state consistency 
 * under boundary conditions.
 */
describe('RuntimeStack Unit Tests', () => {
  let stack: RuntimeStack;
  let harness: BehaviorTestHarness;

  beforeEach(() => {
    stack = new RuntimeStack();
    harness = new BehaviorTestHarness();
  });

  describe('Lifecycle Management', () => {
    it('should correctly pop blocks in LIFO order', () => {
      const block1 = new MockBlock('block-1');
      const block2 = new MockBlock('block-2');

      stack.push(block1);
      stack.push(block2);

      expect(stack.pop()).toBe(block2);
      expect(stack.pop()).toBe(block1);
      expect(stack.pop()).toBeUndefined();
    });

    it('should allow idempotent disposal calls on blocks', () => {
      const block = new MockBlock('test-block');
      const disposeSpy = vi.spyOn(block, 'dispose');

      stack.push(block);
      const popped = stack.pop();

      // Multiple calls to dispose should be safe and recorded
      popped?.dispose(harness.runtime);
      popped?.dispose(harness.runtime);
      popped?.dispose(harness.runtime);

      expect(disposeSpy).toHaveBeenCalledTimes(3);
    });

    it('should maintain block identity integrity', () => {
      const block = new MockBlock({ id: 'identity-test', label: 'Original' });
      stack.push(block);

      const popped = stack.pop() as MockBlock;
      expect(popped).toBe(block);
      expect(popped.key.toString()).toBe('identity-test');
      expect(popped.label).toBe('Original');
    });
  });

  describe('Error Handling and Robustness', () => {
    it('should stay consistent when a block throws during disposal', () => {
      const remainingBlock = new MockBlock('still-here');
      const failingBlock = new MockBlock('failing-block');

      vi.spyOn(failingBlock, 'dispose').mockImplementation(() => {
        throw new Error('Fatal disposal error');
      });

      stack.push(remainingBlock);
      stack.push(failingBlock);

      const popped = stack.pop();
      expect(popped).toBe(failingBlock);
      expect(() => popped?.dispose(harness.runtime)).toThrow('Fatal disposal error');

      // The stack itself should remain stable and track the remaining content
      expect(stack.current).toBe(remainingBlock);
      expect(stack.count).toBe(1);
    });

    it('should handle disposal of multiple blocks sequentially even if one fails', () => {
      const block1 = new MockBlock('1');
      const block2 = new MockBlock('2'); // This one will fail
      const block3 = new MockBlock('3');

      vi.spyOn(block2, 'dispose').mockImplementation(() => { throw new Error('fail'); });

      stack.push(block1);
      stack.push(block2);
      stack.push(block3);

      const disposalResults: string[] = [];
      while (stack.count > 0) {
        const b = stack.pop();
        try {
          b?.dispose(harness.runtime);
          disposalResults.push('success');
        } catch (e) {
          disposalResults.push('fail');
        }
      }

      expect(disposalResults).toEqual(['success', 'fail', 'success']);
      expect(stack.count).toBe(0);
    });
  });

  describe('Boundary Conditions', () => {
    it('should return undefined for current and pop on an empty stack', () => {
      expect(stack.current).toBeUndefined();
      expect(stack.pop()).toBeUndefined();
      expect(stack.blocks).toHaveLength(0);
    });

    it('should handle single block push and pop', () => {
      const block = new MockBlock('lonely-block');
      stack.push(block);
      expect(stack.count).toBe(1);
      expect(stack.pop()).toBe(block);
      expect(stack.count).toBe(0);
    });

    it('should maintain consistency with 100 blocks (Smoke Load Test)', () => {
      const DEPTH = 100;
      const blocks = Array.from({ length: DEPTH }, (_, i) => new MockBlock(`b-${i}`));

      // Push all
      blocks.forEach(b => stack.push(b));
      expect(stack.count).toBe(DEPTH);
      expect(stack.current).toBe(blocks[DEPTH - 1]);

      // Pop all and verify order
      const popped: any[] = [];
      while (stack.count > 0) {
        popped.push(stack.pop());
      }

      expect(popped).toHaveLength(DEPTH);
      expect(popped[0]).toBe(blocks[DEPTH - 1]);
      expect(popped[DEPTH - 1]).toBe(blocks[0]);
    });

    it('should handle double-pop safely', () => {
      stack.push(new MockBlock('test'));
      stack.pop();
      expect(stack.pop()).toBeUndefined();
      expect(stack.count).toBe(0);
    });
  });
});
