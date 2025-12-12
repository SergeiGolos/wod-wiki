/**
 * Contract tests for RuntimeStack API behavior
 * 
 * These tests verify the API contract requirements specified in:
 * specs/001-runtime-stack-needs/contracts/runtime-stack-api.md
 */

import { describe, test, expect, beforeEach, vi } from 'bun:test';
import { RuntimeStack } from '../../../src/runtime/RuntimeStack';
import { BlockKey } from '../../../src/core/models/BlockKey';
import { IRuntimeBlock } from '../../../src/runtime/IRuntimeBlock';
import { IRuntimeAction } from '../../../src/runtime/IRuntimeAction';

// Mock implementation of IRuntimeBlock for testing
class MockRuntimeBlock implements IRuntimeBlock {
  private disposed = false;
  public readonly sourceIds: number[];
  
  constructor(
    public readonly key: BlockKey,
    sourceIds: number[] = [1, 2, 3],
    public readonly initContext?: any
  ) {
    // Constructor-based initialization as per new requirements
    this.sourceIds = sourceIds;
  }
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
    this.disposed = true;
  }
  
  get isDisposed(): boolean {
    return this.disposed;
  }
}

describe('RuntimeStack.push() Contract Tests', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
    vi.clearAllMocks();
  });
  
  test('MUST add block to stack immediately without initialization calls', () => {
    // Arrange
    const block = new MockRuntimeBlock(new BlockKey('test-block'));
    
    // Act
    stack.push(block);
    
    // Assert
    expect(stack.current).toBe(block);
    expect(stack.blocks).toHaveLength(1);
    expect(stack.blocks[0]).toBe(block);
  });
  
  test('MUST maintain LIFO stack ordering', () => {
    // Arrange
    const block1 = new MockRuntimeBlock(new BlockKey('block-1'));
    const block2 = new MockRuntimeBlock(new BlockKey('block-2'));
    const block3 = new MockRuntimeBlock(new BlockKey('block-3'));
    
    // Act
    stack.push(block1);
    stack.push(block2);
    stack.push(block3);
    
    // Assert
    expect(stack.current).toBe(block3); // Last pushed is current
    expect(stack.blocks).toEqual([block3, block2, block1]); // LIFO order (top-first)
    expect(stack.blocksBottomFirst).toEqual([block1, block2, block3]); // Push order (bottom-first)
  });
  
  test('MUST update current block to newly pushed block', () => {
    // Arrange
    const block1 = new MockRuntimeBlock(new BlockKey('block-1'));
    const block2 = new MockRuntimeBlock(new BlockKey('block-2'));
    
    // Act & Assert
    expect(stack.current).toBeUndefined(); // Initially empty
    
    stack.push(block1);
    expect(stack.current).toBe(block1);
    
    stack.push(block2);
    expect(stack.current).toBe(block2);
  });
  
  test('SHOULD throw TypeError for null/undefined blocks', () => {
    // Act & Assert
    expect(() => stack.push(null as any)).toThrow(TypeError);
    expect(() => stack.push(undefined as any)).toThrow(TypeError);
  });
  
  test('MUST NOT call initialization methods during push', () => {
    // Arrange
    const initSpy = vi.fn();
    const block = new MockRuntimeBlock(new BlockKey('test-block'));
    (block as any).initialize = initSpy; // Add optional initialize method
    
    // Act
    stack.push(block);
    
    // Assert
    expect(initSpy).not.toHaveBeenCalled(); // No initialization calls in push
  });
});

describe('RuntimeStack.pop() Contract Tests', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  test('MUST remove and return top block without cleanup calls', () => {
    // Arrange
    const block1 = new MockRuntimeBlock(new BlockKey('block-1'));
    const block2 = new MockRuntimeBlock(new BlockKey('block-2'));
    stack.push(block1);
    stack.push(block2);
    
    const cleanupSpy = vi.fn();
    (block2 as any).cleanup = cleanupSpy; // Add optional cleanup method
    
    // Act
    const popped = stack.pop();
    
    // Assert
    expect(popped).toBe(block2);
    expect(stack.current).toBe(block1); // Previous block is now current
    expect(stack.blocks).toHaveLength(1);
    expect(cleanupSpy).not.toHaveBeenCalled(); // No cleanup calls in pop
  });
  
  test('MUST return undefined for empty stack', () => {
    // Act & Assert
    expect(stack.pop()).toBeUndefined();
    expect(stack.current).toBeUndefined();
  });
  
  test('MUST update current block to previous block', () => {
    // Arrange
    const block1 = new MockRuntimeBlock(new BlockKey('block-1'));
    const block2 = new MockRuntimeBlock(new BlockKey('block-2'));
    const block3 = new MockRuntimeBlock(new BlockKey('block-3'));
    
    stack.push(block1);
    stack.push(block2);
    stack.push(block3);
    
    // Act & Assert
    expect(stack.current).toBe(block3);
    
    stack.pop();
    expect(stack.current).toBe(block2);
    
    stack.pop();
    expect(stack.current).toBe(block1);
    
    stack.pop();
    expect(stack.current).toBeUndefined();
  });
  
  test('Consumer MUST be responsible for calling dispose on returned block', () => {
    // Arrange
    const block = new MockRuntimeBlock(new BlockKey('test-block'));
    stack.push(block);
    
    // Act
    const popped = stack.pop();
    
    // Assert - Block should not be disposed by pop operation
    expect(popped).toBe(block);
    expect((popped as unknown as MockRuntimeBlock).isDisposed).toBe(false);
    
    // Consumer responsibility to dispose
    popped?.dispose({} as any);
    expect((popped as unknown as MockRuntimeBlock).isDisposed).toBe(true);
  });
});

describe('RuntimeStack.current() Contract Tests', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  test('MUST return top block without side effects', () => {
    // Arrange
    const block1 = new MockRuntimeBlock(new BlockKey('block-1'));
    const block2 = new MockRuntimeBlock(new BlockKey('block-2'));
    stack.push(block1);
    stack.push(block2);
    
    const originalLength = stack.blocks.length;
    
    // Act
    const current1 = stack.current;
    const current2 = stack.current; // Multiple calls
    
    // Assert
    expect(current1).toBe(block2);
    expect(current2).toBe(block2);
    expect(stack.blocks.length).toBe(originalLength); // No side effects
  });
  
  test('MUST return undefined for empty stack', () => {
    // Act & Assert
    expect(stack.current).toBeUndefined();
  });
  
  test('MUST be idempotent', () => {
    // Arrange
    const block = new MockRuntimeBlock(new BlockKey('test-block'));
    stack.push(block);
    
    // Act - Multiple calls should return same result
    const result1 = stack.current;
    const result2 = stack.current;
    const result3 = stack.current;
    
    // Assert
    expect(result1).toBe(block);
    expect(result2).toBe(block);
    expect(result3).toBe(block);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });
});

describe('RuntimeStack.graph() Contract Tests', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  test('MUST return top-first ordered array', () => {
    // Arrange
    const block1 = new MockRuntimeBlock(new BlockKey('block-1'));
    const block2 = new MockRuntimeBlock(new BlockKey('block-2'));
    const block3 = new MockRuntimeBlock(new BlockKey('block-3'));
    
    stack.push(block1);
    stack.push(block2);
    stack.push(block3);
    
    // Act
    const graph = stack.graph();
    
    // Assert
    expect(graph).toHaveLength(3);
    expect(graph[0]).toBe(block3); // Top block first
    expect(graph[1]).toBe(block2);
    expect(graph[2]).toBe(block1); // Bottom block last
  });
  
  test('MUST return empty array for empty stack', () => {
    // Act
    const graph = stack.graph();
    
    // Assert
    expect(graph).toEqual([]);
    expect(Array.isArray(graph)).toBe(true);
  });
  
  test('MUST return new array (not reference to internal storage)', () => {
    // Arrange
    const block = new MockRuntimeBlock(new BlockKey('test-block'));
    stack.push(block);
    
    // Act
    const graph1 = stack.graph();
    const graph2 = stack.graph();
    
    // Assert
    expect(graph1).not.toBe(graph2); // Different array instances
    expect(graph1).toEqual(graph2); // Same content
    
    // Modifying returned array should not affect stack
    graph1.pop();
    expect(stack.blocks.length).toBe(1); // Stack unchanged
  });
  
  test('MUST be idempotent and not modify stack state', () => {
    // Arrange
    const block1 = new MockRuntimeBlock(new BlockKey('block-1'));
    const block2 = new MockRuntimeBlock(new BlockKey('block-2'));
    stack.push(block1);
    stack.push(block2);
    
    const originalLength = stack.blocks.length;
    const originalCurrent = stack.current;
    
    // Act
    const graph1 = stack.graph();
    const graph2 = stack.graph();
    
    // Assert
    expect(graph1).toEqual(graph2);
    expect(stack.blocks.length).toBe(originalLength);
    expect(stack.current).toBe(originalCurrent);
  });
  
  test('Performance: MUST complete in reasonable time for typical stack depths', () => {
    // Arrange - Max stack depth is 10
    const blocks: MockRuntimeBlock[] = [];
    for (let i = 0; i < 10; i++) {
      const block = new MockRuntimeBlock(new BlockKey(`block-${i}`));
      blocks.push(block);
      stack.push(block);
    }
    
    // Act & Assert - Should complete quickly
    const start = Date.now();
    const graph = stack.graph();
    const end = Date.now();
    
    expect(end - start).toBeLessThan(50); // <50ms requirement
    expect(graph).toHaveLength(10);
    expect(graph[0]).toBe(blocks[9]); // Last pushed is first in graph
  });
});