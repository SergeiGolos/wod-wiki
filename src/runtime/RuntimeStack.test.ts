import { describe, it, expect, beforeEach } from 'vitest';
import { RuntimeStack } from './RuntimeStack';
import { IRuntimeBlock } from './IRuntimeBlock';
import { BlockKey } from '../BlockKey';

// Mock runtime block for testing
const createMockBlock = (keyValue: string): IRuntimeBlock => ({
  key: { value: keyValue } as BlockKey,
  spans: {} as any,
  handlers: [],
  metrics: [],
  parent: undefined,
  next: () => [],
  onEnter: () => {},
  inherit: () => ({} as any)
});

describe('RuntimeStack', () => {
  let stack: RuntimeStack;

  beforeEach(() => {
    stack = new RuntimeStack();
  });

  describe('initial state', () => {
    it('should start empty', () => {
      expect(stack.isEmpty()).toBe(true);
      expect(stack.depth()).toBe(0);
      expect(stack.peek()).toBeUndefined();
    });
  });

  describe('push and pop operations', () => {
    it('should push and pop blocks correctly', () => {
      const block1 = createMockBlock('block1');
      const block2 = createMockBlock('block2');

      stack.push(block1);
      expect(stack.depth()).toBe(1);
      expect(stack.peek()).toBe(block1);

      stack.push(block2);
      expect(stack.depth()).toBe(2);
      expect(stack.peek()).toBe(block2);

      const popped = stack.pop();
      expect(popped).toBe(block2);
      expect(stack.depth()).toBe(1);
      expect(stack.peek()).toBe(block1);
    });

    it('should set parent relationships when pushing', () => {
      const block1 = createMockBlock('block1');
      const block2 = createMockBlock('block2');
      const block3 = createMockBlock('block3');

      stack.push(block1);
      expect(block1.parent).toBeUndefined();

      stack.push(block2);
      expect(block2.parent).toBe(block1);

      stack.push(block3);
      expect(block3.parent).toBe(block2);
    });

    it('should return undefined when popping empty stack', () => {
      const result = stack.pop();
      expect(result).toBeUndefined();
    });
  });

  describe('getParentBlocks', () => {
    it('should return empty array for empty stack', () => {
      const parents = stack.getParentBlocks();
      expect(parents).toEqual([]);
    });

    it('should return empty array for single block', () => {
      stack.push(createMockBlock('block1'));
      const parents = stack.getParentBlocks();
      expect(parents).toEqual([]);
    });

    it('should return parent blocks excluding current', () => {
      const block1 = createMockBlock('block1');
      const block2 = createMockBlock('block2');
      const block3 = createMockBlock('block3');

      stack.push(block1);
      stack.push(block2);
      stack.push(block3);

      const parents = stack.getParentBlocks();
      expect(parents).toEqual([block1, block2]);
      expect(parents).not.toContain(block3); // Current block not included
    });
  });

  describe('utility methods', () => {
    it('should identify empty stack correctly', () => {
      expect(stack.isEmpty()).toBe(true);

      stack.push(createMockBlock('block1'));
      expect(stack.isEmpty()).toBe(false);

      stack.pop();
      expect(stack.isEmpty()).toBe(true);
    });

    it('should get root block correctly', () => {
      expect(stack.getRoot()).toBeUndefined();

      const block1 = createMockBlock('block1');
      const block2 = createMockBlock('block2');

      stack.push(block1);
      expect(stack.getRoot()).toBe(block1);

      stack.push(block2);
      expect(stack.getRoot()).toBe(block1); // Still the root
    });

    it('should clear stack correctly', () => {
      stack.push(createMockBlock('block1'));
      stack.push(createMockBlock('block2'));
      
      expect(stack.depth()).toBe(2);

      stack.clear();
      expect(stack.isEmpty()).toBe(true);
      expect(stack.depth()).toBe(0);
    });

    it('should find blocks by key', () => {
      const block1 = createMockBlock('block1');
      const block2 = createMockBlock('block2');

      stack.push(block1);
      stack.push(block2);

      expect(stack.findByKey('block1')).toBe(block1);
      expect(stack.findByKey('block2')).toBe(block2);
      expect(stack.findByKey('nonexistent')).toBeUndefined();
    });

    it('should get all blocks in correct order', () => {
      const block1 = createMockBlock('block1');
      const block2 = createMockBlock('block2');
      const block3 = createMockBlock('block3');

      stack.push(block1);
      stack.push(block2);
      stack.push(block3);

      const allBlocks = stack.getAllBlocks();
      expect(allBlocks).toEqual([block1, block2, block3]);
      
      // Should be a copy, not the original array
      allBlocks.push(createMockBlock('extra'));
      expect(stack.depth()).toBe(3); // Original unchanged
    });
  });
});