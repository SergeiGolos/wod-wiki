/**
 * Unit tests for RuntimeStack error conditions and edge cases
 * 
 * These tests verify error handling, boundary conditions, and unusual scenarios
 * in the RuntimeStack implementation.
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { RuntimeStack } from './RuntimeStack';
import { BlockKey } from '../BlockKey';
import { IRuntimeBlock } from './IRuntimeBlock';
import { IRuntimeAction } from './IRuntimeAction';

// Minimal block for testing boundary conditions
class MinimalBlock implements IRuntimeBlock {
  public readonly sourceId: number[] = [];
  
  constructor(public readonly key: BlockKey) {}
  
  push(): IRuntimeAction[] { return []; }
  next(): IRuntimeAction[] { return []; }
  pop(): IRuntimeAction[] { return []; }
  dispose(): void {}
}

describe('RuntimeStack Error Conditions', () => {
  let stack: RuntimeStack;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    stack = new RuntimeStack();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleSpy.mockRestore();
  });
  
  test('invalid block types are rejected', () => {
    // Test various invalid inputs
    const invalidInputs = [
      null,
      undefined,
      {},
      'string',
      42,
      [],
      { key: null },
      { key: undefined },
      { someProperty: 'value' }
    ];
    
    invalidInputs.forEach((invalid, index) => {
      expect(() => stack.push(invalid as any), `Input ${index}: ${typeof invalid}`).toThrow(TypeError);
    });
  });
  
  test('blocks with problematic keys are handled', () => {
    // Test edge cases for block keys
    const edgeCases = [
      { key: null, expectError: true },
      { key: undefined, expectError: true },
      { key: new BlockKey(''), expectError: false }, // Empty string key is valid
      { key: new BlockKey('very-long-key-name-that-might-cause-issues-in-logging-or-display'), expectError: false }
    ];
    
    edgeCases.forEach(({ key, expectError }, index) => {
      const block = {
        key,
        sourceId: [1],
        push: () => [],
        next: () => [],
        pop: () => [],
        dispose: () => {}
      } as unknown as IRuntimeBlock;
      
      if (expectError) {
        expect(() => stack.push(block), `Edge case ${index}`).toThrow();
      } else {
        expect(() => stack.push(block), `Edge case ${index}`).not.toThrow();
        stack.pop(); // Clean up
      }
    });
  });
  
  test('concurrent modifications do not corrupt stack', () => {
    // This tests that rapid push/pop operations don't corrupt internal state
    const blocks: MinimalBlock[] = [];
    
    // Create blocks
    for (let i = 0; i < 10; i++) {
      blocks.push(new MinimalBlock(new BlockKey(`concurrent-${i}`)));
    }
    
    // Rapid push/pop operations
    blocks.forEach(block => stack.push(block));
    expect(stack.blocks.length).toBe(10);
    
    // Interleaved push and pop operations
    stack.push(new MinimalBlock(new BlockKey('extra-1')));
    stack.pop();
    stack.push(new MinimalBlock(new BlockKey('extra-2')));
    stack.pop();
    
    // Stack should still be consistent
    expect(stack.blocks.length).toBe(10);
    expect(stack.current).toBe(blocks[9]); // Last originally pushed block
  });
  
  test('memory pressure with large numbers of blocks', () => {
    // Test with a large number of blocks to check memory handling
    const STRESS_TEST_SIZE = 5000;
    const blocks: MinimalBlock[] = [];
    
    // Push many blocks
    for (let i = 0; i < STRESS_TEST_SIZE; i++) {
      const block = new MinimalBlock(new BlockKey(`stress-${i}`));
      blocks.push(block);
      stack.push(block);
    }
    
    expect(stack.blocks.length).toBe(STRESS_TEST_SIZE);
    
    // Pop all blocks and dispose them
    const disposedBlocks: IRuntimeBlock[] = [];
    while (stack.blocks.length > 0) {
      const popped = stack.pop();
      if (popped) {
        popped.dispose();
        disposedBlocks.push(popped);
      }
    }
    
    expect(disposedBlocks.length).toBe(STRESS_TEST_SIZE);
    expect(stack.blocks.length).toBe(0);
  });
});

describe('RuntimeStack Boundary Conditions', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  test('empty stack operations', () => {
    // Test all operations on empty stack
    expect(stack.current).toBeUndefined();
    expect(stack.blocks).toEqual([]);
    expect(stack.blocksTopFirst).toEqual([]);
    expect(stack.blocksBottomFirst).toEqual([]);
    expect(stack.keys).toEqual([]);
    expect(stack.graph()).toEqual([]);
    expect(stack.getParentBlocks()).toEqual([]);
    
    // Pop on empty stack should return undefined
    expect(stack.pop()).toBeUndefined();
  });
  
  test('stack with one element operations', () => {
    const block = new MinimalBlock(new BlockKey('single'));
    
    // Single push
    stack.push(block);
    expect(stack.current).toBe(block);
    expect(stack.blocks).toEqual([block]);
    expect(stack.keys).toEqual([block.key]);
    expect(stack.graph()).toEqual([block]);
    expect(stack.getParentBlocks()).toEqual([]);
    
    // Single pop
    const popped = stack.pop();
    expect(popped).toBe(block);
    expect(stack.current).toBeUndefined();
    expect(stack.blocks).toEqual([]);
  });
  
  test('repeated push and pop of same block', () => {
    const block = new MinimalBlock(new BlockKey('reused'));
    
    // Push and pop same block multiple times
    for (let i = 0; i < 5; i++) {
      stack.push(block);
      expect(stack.current).toBe(block);
      
      const popped = stack.pop();
      expect(popped).toBe(block);
      expect(stack.current).toBeUndefined();
    }
  });
  
  test('blocks with identical keys', () => {
    // Test blocks with same key content (but different instances)
    const key1 = new BlockKey('duplicate');
    const key2 = new BlockKey('duplicate'); // Same content, different instance
    
    const block1 = new MinimalBlock(key1);
    const block2 = new MinimalBlock(key2);
    
    stack.push(block1);
    stack.push(block2);
    
    expect(stack.blocks.length).toBe(2);
    expect(stack.current).toBe(block2);
    
    // Should be able to distinguish between blocks even with same key content
    const popped1 = stack.pop();
    const popped2 = stack.pop();
    
    expect(popped1).toBe(block2);
    expect(popped2).toBe(block1);
  });
});

describe('RuntimeStack Graph Method Edge Cases', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  test('graph() with various stack sizes', () => {
    const blocks: MinimalBlock[] = [];
    
    // Test empty
    expect(stack.graph()).toEqual([]);
    
    // Test with 1, 2, 3, 10 blocks
    [1, 2, 3, 10].forEach(size => {
      // Clear stack
      while (stack.blocks.length > 0) {
        stack.pop();
      }
      blocks.length = 0;
      
      // Add blocks
      for (let i = 0; i < size; i++) {
        const block = new MinimalBlock(new BlockKey(`graph-test-${i}`));
        blocks.push(block);
        stack.push(block);
      }
      
      const graph = stack.graph();
      expect(graph.length).toBe(size);
      
      if (size > 0) {
        // First element should be last pushed (top of stack)
        expect(graph[0]).toBe(blocks[size - 1]);
        // Last element should be first pushed (bottom of stack)
        expect(graph[size - 1]).toBe(blocks[0]);
      }
    });
  });
  
  test('graph() returns independent arrays', () => {
    const block1 = new MinimalBlock(new BlockKey('independent-1'));
    const block2 = new MinimalBlock(new BlockKey('independent-2'));
    
    stack.push(block1);
    stack.push(block2);
    
    const graph1 = stack.graph();
    const graph2 = stack.graph();
    
    // Should be different array instances
    expect(graph1).not.toBe(graph2);
    expect(graph1).toEqual(graph2);
    
    // Modifying one should not affect the other or the stack
    graph1.pop();
    expect(graph2.length).toBe(2);
    expect(stack.blocks.length).toBe(2);
    
    graph2.push(new MinimalBlock(new BlockKey('extra')));
    expect(graph1.length).toBe(1);
    expect(stack.blocks.length).toBe(2);
  });
});

describe('RuntimeStack Performance Edge Cases', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  test('operations maintain O(1) time complexity', () => {
    const PERFORMANCE_TEST_SIZE = 10000;
    
    // Measure push operations
    const pushTimes: number[] = [];
    for (let i = 0; i < PERFORMANCE_TEST_SIZE; i++) {
      const start = performance.now();
      stack.push(new MinimalBlock(new BlockKey(`perf-${i}`)));
      const end = performance.now();
      pushTimes.push(end - start);
    }
    
    // Measure pop operations
    const popTimes: number[] = [];
    for (let i = 0; i < PERFORMANCE_TEST_SIZE; i++) {
      const start = performance.now();
      stack.pop();
      const end = performance.now();
      popTimes.push(end - start);
    }
    
    // Performance should not degrade significantly with size
    const avgEarlyPush = pushTimes.slice(0, 100).reduce((a, b) => a + b) / 100;
    const avgLatePush = pushTimes.slice(-100).reduce((a, b) => a + b) / 100;
    const avgEarlyPop = popTimes.slice(0, 100).reduce((a, b) => a + b) / 100;
    const avgLatePop = popTimes.slice(-100).reduce((a, b) => a + b) / 100;
    
    // Late operations should not be more than 10x slower than early ones
    expect(avgLatePush).toBeLessThan(avgEarlyPush * 10);
    expect(avgLatePop).toBeLessThan(avgEarlyPop * 10);
  });
  
  test('graph() performance scales linearly', () => {
    const sizes = [100, 500, 1000, 2000];
    const times: number[] = [];
    
    sizes.forEach(size => {
      // Clear and fill stack
      while (stack.blocks.length > 0) stack.pop();
      
      for (let i = 0; i < size; i++) {
        stack.push(new MinimalBlock(new BlockKey(`scale-${i}`)));
      }
      
      // Measure graph operation
      const start = performance.now();
      const graph = stack.graph();
      const end = performance.now();
      
      times.push(end - start);
      expect(graph.length).toBe(size);
    });
    
    // All operations should complete in reasonable time
    times.forEach(time => {
      expect(time).toBeLessThan(50); // <50ms requirement
    });
  });
});