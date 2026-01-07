/**
 * Unit tests for RuntimeStack error conditions and edge cases
 * 
 * These tests verify error handling, boundary conditions, and unusual scenarios
 * in the RuntimeStack implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { RuntimeStack } from '../../../src/runtime/RuntimeStack';
import { BlockKey } from '../../../src/core/models/BlockKey';
import { IRuntimeBlock } from '../../../src/runtime/IRuntimeBlock';
import { IRuntimeAction } from '../../../src/runtime/IRuntimeAction';

// Minimal block for testing boundary conditions
class MinimalBlock implements IRuntimeBlock {
  public readonly sourceIds: number[] = [];
  private _isComplete = false;
  
  constructor(public readonly key: BlockKey) {}

  get isComplete(): boolean { return this._isComplete; }
  markComplete(_reason?: string): void { this._isComplete = true; }
  
  mount(_runtime: any): IRuntimeAction[] { return []; }
  next(_runtime: any): IRuntimeAction[] { return []; }
  unmount(_runtime: any): IRuntimeAction[] { return []; }
  dispose(_runtime: any): void {}
}

describe('RuntimeStack Boundary Conditions', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  it('empty stack operations', () => {
    // Test all operations on empty stack
    expect(stack.current).toBeUndefined();
    expect(stack.blocks).toEqual([]);
    expect(stack.keys).toEqual([]);
    
    // Pop on empty stack should return undefined
    expect(stack.pop()).toBeUndefined();
  });
  
  it('stack with one element operations', () => {
    const block = new MinimalBlock(new BlockKey('single'));
    
    // Single push
    stack.push(block);
    expect(stack.current).toBe(block);
    expect(stack.blocks).toEqual([block]);
    expect(stack.keys).toEqual([block.key]);
    
    // Single pop
    const popped = stack.pop();
    expect(popped).toBe(block);
    expect(stack.current).toBeUndefined();
    expect(stack.blocks).toEqual([]);
  });
  
  it('repeated push and pop of same block', () => {
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
  
  it('blocks with identical keys', () => {
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

describe('RuntimeStack Performance Edge Cases', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  it('operations maintain O(1) time complexity', () => {
    // Max stack depth is 10, so we test by doing multiple cycles
    const CYCLES = 1000;
    const STACK_SIZE = 10;
    
    // Measure push operations over multiple cycles
    const pushTimes: number[] = [];
    for (let cycle = 0; cycle < CYCLES; cycle++) {
      for (let i = 0; i < STACK_SIZE; i++) {
        const start = performance.now();
        stack.push(new MinimalBlock(new BlockKey(`perf-${cycle}-${i}`)));
        const end = performance.now();
        pushTimes.push(end - start);
      }
      
      // Pop all to prepare for next cycle
      while (stack.blocks.length > 0) {
        stack.pop();
      }
    }
    
    // Measure pop operations over multiple cycles
    const popTimes: number[] = [];
    for (let cycle = 0; cycle < CYCLES; cycle++) {
      // Fill stack first
      for (let i = 0; i < STACK_SIZE; i++) {
        stack.push(new MinimalBlock(new BlockKey(`perf-pop-${cycle}-${i}`)));
      }
      
      // Measure pops
      for (let i = 0; i < STACK_SIZE; i++) {
        const start = performance.now();
        stack.pop();
        const end = performance.now();
        popTimes.push(end - start);
      }
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
  
});
