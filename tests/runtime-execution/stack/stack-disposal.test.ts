/**
 * Unit tests for RuntimeStack disposal methods and edge cases
 * 
 * These tests verify the unit-level behavior of dispose methods, error handling,
 * and edge cases in the RuntimeStack implementation.
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { RuntimeStack } from '../../../src/runtime/RuntimeStack';
import { BlockKey } from '../../../src/BlockKey';
import { IRuntimeBlock } from '../../../src/runtime/IRuntimeBlock';
import { IRuntimeAction } from './IRuntimeAction';

// Mock implementation with controllable dispose behavior
class TestRuntimeBlock implements IRuntimeBlock {
  public readonly sourceId: number[] = [1, 2, 3];
  public disposeCallCount = 0;
  public shouldThrowOnDispose = false;
  
  constructor(
    public readonly key: BlockKey,
    public readonly description: string = 'test block'
  ) {
    // Constructor-based initialization
  }
  sourceIds: number[] = [];
  blockType?: string | undefined;
  
  mount(_runtime: any): IRuntimeAction[] {
    return [];
  }
  
  next(_runtime: any): IRuntimeAction[] {
    return [];
  }
  
  unmount(_runtime: any): IRuntimeAction[] {
    return [];
  }
  
  dispose(_runtime: any): void {
    this.disposeCallCount++;
    if (this.shouldThrowOnDispose) {
      throw new Error(`Dispose failed for ${this.key.toString()}`);
    }
  }
}

describe('RuntimeStack Dispose Method Unit Tests', () => {
  let stack: RuntimeStack;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let mockRuntime: any;
  
  beforeEach(() => {
    stack = new RuntimeStack();
    mockRuntime = {}; // Minimal mock runtime for dispose calls
    // Spy on console.log to verify logging behavior
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    consoleSpy.mockRestore();
  });
  
  test('dispose() method is called correctly on blocks', () => {
    // Arrange
    const block1 = new TestRuntimeBlock(new BlockKey('block-1'));
    const block2 = new TestRuntimeBlock(new BlockKey('block-2'));
    
    stack.push(block1);
    stack.push(block2);
    
    // Act
    const popped1 = stack.pop();
    const popped2 = stack.pop();
    
    // Verify blocks are returned correctly
    expect(popped1).toBe(block2);
    expect(popped2).toBe(block1);
    
    // Consumer calls dispose
    popped1?.dispose(mockRuntime);
    popped2?.dispose(mockRuntime);
    
    // Assert
    expect(block1.disposeCallCount).toBe(1);
    expect(block2.disposeCallCount).toBe(1);
  });
  
  test('dispose() can be called multiple times (idempotent)', () => {
    // Arrange
    const block = new TestRuntimeBlock(new BlockKey('test-block'));
    stack.push(block);
    
    // Act
    const popped = stack.pop();
    expect(popped).toBe(block);
    
    // Call dispose multiple times
    popped?.dispose(mockRuntime);
    popped?.dispose(mockRuntime);
    popped?.dispose(mockRuntime);
    
    // Assert
    expect(block.disposeCallCount).toBe(3); // Should be safe to call multiple times
  });
  
  test('dispose() errors do not break stack operations', () => {
    // Arrange
    const goodBlock = new TestRuntimeBlock(new BlockKey('good-block'));
    const badBlock = new TestRuntimeBlock(new BlockKey('bad-block'));
    badBlock.shouldThrowOnDispose = true;
    
    stack.push(goodBlock);
    stack.push(badBlock);
    
    // Act & Assert
    const poppedBad = stack.pop();
    expect(poppedBad).toBe(badBlock);
    
    // Dispose should throw but not affect stack
    expect(() => poppedBad?.dispose(mockRuntime)).toThrow('Dispose failed for bad-block');
    expect(stack.current).toBe(goodBlock); // Stack unaffected
    
    const poppedGood = stack.pop();
    expect(poppedGood).toBe(goodBlock);
    expect(() => poppedGood?.dispose(mockRuntime)).not.toThrow();
  });
  
  test('blocks maintain identity after pop before dispose', () => {
    // Arrange
    const originalBlock = new TestRuntimeBlock(new BlockKey('identity-test'));
    stack.push(originalBlock);
    
    // Act
    const poppedBlock = stack.pop();
    
    // Assert - same object reference
    expect(poppedBlock).toBe(originalBlock);
    expect(poppedBlock?.key).toBe(originalBlock.key);
    expect((poppedBlock as TestRuntimeBlock)?.description).toBe(originalBlock.description);
    
    // Dispose should work on same object
    poppedBlock?.dispose(mockRuntime);
    expect(originalBlock.disposeCallCount).toBe(1);
  });
});

describe('RuntimeStack Error Handling Unit Tests', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  test('push() throws TypeError for null block', () => {
    // Act & Assert
    expect(() => stack.push(null as any)).toThrow(TypeError);
    expect(() => stack.push(null as any)).toThrow('Block cannot be null or undefined');
  });
  
  test('push() throws TypeError for undefined block', () => {
    // Act & Assert
    expect(() => stack.push(undefined as any)).toThrow(TypeError);
    expect(() => stack.push(undefined as any)).toThrow('Block cannot be null or undefined');
  });
  
  test('push() throws TypeError for block without key', () => {
    // Arrange
    const invalidBlock = {
      sourceId: [1, 2, 3],
      push: () => [],
      next: () => [],
      pop: () => [],
      dispose: () => {},
      key: null // Invalid key
    } as unknown as IRuntimeBlock;
    
    // Act & Assert
    expect(() => stack.push(invalidBlock)).toThrow(TypeError);
    expect(() => stack.push(invalidBlock)).toThrow('Block must have a valid key');
  });
  
  test('pop() returns undefined for empty stack (not an error)', () => {
    // Act
    const result = stack.pop();
    
    // Assert
    expect(result).toBeUndefined();
    expect(stack.current).toBeUndefined();
  });
  
  test('multiple pops on empty stack return undefined', () => {
    // Act
    const result1 = stack.pop();
    const result2 = stack.pop();
    const result3 = stack.pop();
    
    // Assert
    expect(result1).toBeUndefined();
    expect(result2).toBeUndefined();
    expect(result3).toBeUndefined();
  });
});

describe('RuntimeStack Edge Cases Unit Tests', () => {
  let stack: RuntimeStack;
  let mockRuntime: any;
  
  beforeEach(() => {
    stack = new RuntimeStack();
    mockRuntime = {}; // Minimal mock runtime for dispose calls
  });
  
  test('current() returns undefined for empty stack', () => {
    // Act & Assert
    expect(stack.current).toBeUndefined();
  });
  
  test('graph() returns empty array for empty stack', () => {
    // Act
    const graph = stack.graph();
    
    // Assert
    expect(graph).toEqual([]);
    expect(Array.isArray(graph)).toBe(true);
  });
  
  test('blocks getters return empty arrays for empty stack', () => {
    // Act & Assert
    expect(stack.blocks).toEqual([]);
    expect(stack.blocksTopFirst).toEqual([]);
    expect(stack.blocksBottomFirst).toEqual([]);
    expect(stack.keys).toEqual([]);
  });
  
  test('single block operations work correctly', () => {
    // Arrange
    const block = new TestRuntimeBlock(new BlockKey('single-block'));
    
    // Act & Assert - push
    stack.push(block);
    expect(stack.current).toBe(block);
    expect(stack.blocks).toHaveLength(1);
    expect(stack.graph()).toEqual([block]);
    
    // Act & Assert - pop
    const popped = stack.pop();
    expect(popped).toBe(block);
    expect(stack.current).toBeUndefined();
    expect(stack.blocks).toHaveLength(0);
    
    // Consumer dispose
    popped?.dispose(mockRuntime);
    expect(block.disposeCallCount).toBe(1);
  });
  
  test('large stack operations maintain performance', () => {
    // Arrange - max stack depth is 10
    const LARGE_STACK_SIZE = 10;
    const blocks: TestRuntimeBlock[] = [];
    
    // Create large number of blocks
    for (let i = 0; i < LARGE_STACK_SIZE; i++) {
      blocks.push(new TestRuntimeBlock(new BlockKey(`block-${i}`)));
    }
    
    // Act - push all blocks
    const pushStart = Date.now();
    blocks.forEach(block => stack.push(block));
    const pushEnd = Date.now();
    
    // Assert stack state
    expect(stack.blocks).toHaveLength(LARGE_STACK_SIZE);
    expect(stack.current).toBe(blocks[LARGE_STACK_SIZE - 1]);
    
    // Act - graph operation
    const graphStart = Date.now();
    const graph = stack.graph();
    const graphEnd = Date.now();
    
    // Assert graph correctness and performance
    expect(graph).toHaveLength(LARGE_STACK_SIZE);
    expect(graph[0]).toBe(blocks[LARGE_STACK_SIZE - 1]); // Top block first
    expect(graphEnd - graphStart).toBeLessThan(50); // <50ms requirement
    
    // Act - pop all blocks
    const popStart = Date.now();
    const poppedBlocks: TestRuntimeBlock[] = [];
    while (stack.blocks.length > 0) {
      const popped = stack.pop() as TestRuntimeBlock;
      if (popped) {
        poppedBlocks.push(popped);
        popped.dispose(mockRuntime);
      }
    }
    const popEnd = Date.now();
    
    // Assert pop correctness and performance
    expect(poppedBlocks).toHaveLength(LARGE_STACK_SIZE);
    expect(stack.blocks).toHaveLength(0);
    expect(popEnd - popStart).toBeLessThan(100); // Reasonable performance for large stack
    
    // Verify all blocks were disposed
    blocks.forEach(block => {
      expect(block.disposeCallCount).toBe(1);
    });
    
    // Overall operation time should be reasonable
    const totalTime = (pushEnd - pushStart) + (graphEnd - graphStart) + (popEnd - popStart);
    expect(totalTime).toBeLessThan(500); // Total operations under 500ms
  });
});
