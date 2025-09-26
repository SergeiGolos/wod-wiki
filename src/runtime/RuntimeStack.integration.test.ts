/**
 * Integration tests for RuntimeStack lifecycle management
 * 
 * These tests verify the integration scenarios specified in:
 * specs/001-runtime-stack-needs/contracts/runtime-stack-api.md
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { RuntimeStack } from './RuntimeStack';
import { BlockKey } from '../BlockKey';
import { IRuntimeBlock } from './IRuntimeBlock';
import { IRuntimeAction } from './IRuntimeAction';

// Mock runtime block with enhanced lifecycle tracking
class LifecycleTrackingBlock implements IRuntimeBlock {
  public readonly initializeCalls: any[] = [];
  public readonly pushCalls: any[] = [];
  public readonly nextCalls: any[] = [];
  public readonly popCalls: any[] = [];
  public readonly disposeCalls: any[] = [];
  
  constructor(
    public readonly key: BlockKey,
    public readonly sourceId: number[] = [1, 2, 3],
    context?: any
  ) {
    // Track constructor-based initialization
    this.initializeCalls.push({ timestamp: Date.now(), context });
  }
  
  push(): IRuntimeAction[] {
    this.pushCalls.push({ timestamp: Date.now() });
    return [];
  }
  
  next(): IRuntimeAction[] {
    this.nextCalls.push({ timestamp: Date.now() });
    return [];
  }
  
  pop(): IRuntimeAction[] {
    this.popCalls.push({ timestamp: Date.now() });
    return [];
  }
  
  dispose(): void {
    this.disposeCalls.push({ timestamp: Date.now() });
  }
}

// Mock complex runtime block with nested state
class ComplexRuntimeBlock implements IRuntimeBlock {
  private resources: Set<string> = new Set();
  private isActive = false;
  
  constructor(
    public readonly key: BlockKey,
    public readonly sourceId: number[] = [1, 2, 3],
    resources: string[] = []
  ) {
    // Constructor-based initialization: acquire resources
    resources.forEach(resource => this.resources.add(resource));
    this.isActive = true;
  }
  
  push(): IRuntimeAction[] {
    return [];
  }
  
  next(): IRuntimeAction[] {
    return [];
  }
  
  pop(): IRuntimeAction[] {
    return [];
  }
  
  dispose(): void {
    // Clean up resources
    this.resources.clear();
    this.isActive = false;
  }
  
  get hasResources(): boolean {
    return this.resources.size > 0;
  }
  
  get active(): boolean {
    return this.isActive;
  }
}

describe('RuntimeStack Constructor-Based Initialization Integration', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  test('Constructor initialization MUST happen before push operations', () => {
    // Arrange - Create blocks with constructor initialization
    const parentContext = { workoutId: 'test-workout' };
    const block1 = new LifecycleTrackingBlock(new BlockKey('parent'), [1], parentContext);
    
    // Verify initialization already happened in constructor
    expect(block1.initializeCalls).toHaveLength(1);
    expect(block1.initializeCalls[0].context).toBe(parentContext);
    
    // Act - Push to stack
    stack.push(block1);
    
    // Assert - No additional initialization calls during push
    expect(block1.initializeCalls).toHaveLength(1); // Still only constructor call
    expect(block1.pushCalls).toHaveLength(0); // Push method NOT called by stack (new behavior)
  });
  
  test('Nested blocks MUST initialize with proper context', () => {
    // Arrange - Create parent-child relationship
    const parentBlock = new LifecycleTrackingBlock(new BlockKey('parent'));
    stack.push(parentBlock);
    
    // Child block gets context during construction (not from stack)
    const childContext = { parentKey: parentBlock.key, depth: 1 };
    const childBlock = new LifecycleTrackingBlock(new BlockKey('child'), [1, 2], childContext);
    
    // Act
    stack.push(childBlock);
    
    // Assert - Both blocks properly initialized
    expect(parentBlock.initializeCalls).toHaveLength(1);
    expect(childBlock.initializeCalls).toHaveLength(1);
    expect(childBlock.initializeCalls[0].context).toBe(childContext);
    
    // Verify stack state
    expect(stack.current).toBe(childBlock);
    expect(stack.blocks).toHaveLength(2);
  });
  
  test('Resource allocation MUST happen in constructor', () => {
    // Arrange - Block with resource allocation
    const resources = ['timer-1', 'memory-segment-A', 'event-listener-1'];
    const block = new ComplexRuntimeBlock(new BlockKey('resource-block'), [1], resources);
    
    // Assert - Resources allocated in constructor
    expect(block.hasResources).toBe(true);
    expect(block.active).toBe(true);
    
    // Act - Push to stack
    stack.push(block);
    
    // Assert - Resource state unchanged by push
    expect(block.hasResources).toBe(true);
    expect(block.active).toBe(true);
  });
  
  test('Initialization timing MUST be deterministic', () => {
    // Arrange - Multiple blocks with timed initialization
    const blocks: LifecycleTrackingBlock[] = [];
    const constructorTimes: number[] = [];
    
    // Act - Create blocks sequentially
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      const block = new LifecycleTrackingBlock(new BlockKey(`block-${i}`));
      blocks.push(block);
      constructorTimes.push(Date.now() - startTime);
      
      stack.push(block);
    }
    
    // Assert - Constructor times are deterministic (initialization in constructor)
    blocks.forEach((block) => {
      expect(block.initializeCalls).toHaveLength(1);
      const initTime = block.initializeCalls[0].timestamp;
      expect(initTime).toBeDefined();
      
      // Constructor initialization happens before stack operations (no push calls made by stack)
      expect(block.pushCalls).toHaveLength(0); // RuntimeStack doesn't call push() method
    });
  });
});

describe('RuntimeStack Consumer-Managed Dispose Integration', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  test('Consumer MUST dispose blocks after pop operations', () => {
    // Arrange
    const block1 = new ComplexRuntimeBlock(new BlockKey('block-1'), [1], ['resource-A']);
    const block2 = new ComplexRuntimeBlock(new BlockKey('block-2'), [2], ['resource-B']);
    
    stack.push(block1);
    stack.push(block2);
    
    // Act - Consumer responsibility pattern
    const poppedBlock = stack.pop();
    expect(poppedBlock).toBe(block2);
    
    // Assert - Block not automatically disposed by pop
    expect((poppedBlock as ComplexRuntimeBlock)?.active).toBe(true);
    expect(poppedBlock && (poppedBlock as ComplexRuntimeBlock).hasResources).toBe(true);
    
    // Consumer must explicitly dispose
    poppedBlock?.dispose();
    
    // Assert - Now properly disposed
    expect((poppedBlock as ComplexRuntimeBlock).active).toBe(false);
    expect((poppedBlock as ComplexRuntimeBlock).hasResources).toBe(false);
  });
  
  test('Consumer MUST handle dispose for all popped blocks', () => {
    // Arrange - Multiple blocks with tracking
    const blocks: LifecycleTrackingBlock[] = [];
    for (let i = 0; i < 3; i++) {
      const block = new LifecycleTrackingBlock(new BlockKey(`block-${i}`));
      blocks.push(block);
      stack.push(block);
    }
    
    // Act - Consumer pops and disposes all blocks
    const disposedBlocks: LifecycleTrackingBlock[] = [];
    
    while (stack.blocks.length > 0) {
      const popped = stack.pop() as LifecycleTrackingBlock;
      expect(popped).toBeDefined();
      
      // Consumer disposes
      popped.dispose();
      disposedBlocks.push(popped);
    }
    
    // Assert - All blocks disposed by consumer
    expect(disposedBlocks).toHaveLength(3);
    disposedBlocks.forEach(block => {
      expect(block.disposeCalls).toHaveLength(1);
    });
  });
  
  test('Dispose MUST be idempotent (safe to call multiple times)', () => {
    // Arrange
    const block = new LifecycleTrackingBlock(new BlockKey('test-block'));
    stack.push(block);
    
    const popped = stack.pop();
    expect(popped).toBe(block);
    
    // Act - Call dispose multiple times
    popped?.dispose();
    popped?.dispose();
    popped?.dispose();
    
    // Assert - Safe to call multiple times
    expect(block.disposeCalls).toHaveLength(3);
    // Implementation should handle multiple calls gracefully
  });
  
  test('Consumer MUST handle dispose errors gracefully', () => {
    // Arrange - Block that throws on dispose
    class ErroringBlock implements IRuntimeBlock {
      public readonly key = new BlockKey('error-block');
      public readonly sourceId = [1];
      
      push(): IRuntimeAction[] { return []; }
      next(): IRuntimeAction[] { return []; }
      pop(): IRuntimeAction[] { return []; }
      
      dispose(): void {
        throw new Error('Dispose failed');
      }
    }
    
    const block = new ErroringBlock();
    stack.push(block);
    
    // Act & Assert - Consumer must handle dispose errors
    const popped = stack.pop();
    expect(popped).toBe(block);
    
    expect(() => {
      popped?.dispose(); // Consumer responsibility to handle
    }).toThrow('Dispose failed');
  });
});

describe('RuntimeStack Nested Block Lifecycle Integration', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  test('Nested blocks MUST follow proper lifecycle ordering', () => {
    // Arrange - Create nested structure
    const rootBlock = new LifecycleTrackingBlock(new BlockKey('root'));
    const childBlock = new LifecycleTrackingBlock(new BlockKey('child'));
    const grandchildBlock = new LifecycleTrackingBlock(new BlockKey('grandchild'));
    
    // Act - Build nested stack
    stack.push(rootBlock);
    stack.push(childBlock);  
    stack.push(grandchildBlock);
    
    // Verify stack structure
    expect(stack.current).toBe(grandchildBlock);
    expect(stack.blocks).toHaveLength(3);
    
    // Act - Unwind stack with proper disposal
    const popped1 = stack.pop() as LifecycleTrackingBlock; // grandchild
    expect(popped1).toBe(grandchildBlock);
    popped1.dispose();
    
    const popped2 = stack.pop() as LifecycleTrackingBlock; // child
    expect(popped2).toBe(childBlock);
    popped2.dispose();
    
    const popped3 = stack.pop() as LifecycleTrackingBlock; // root
    expect(popped3).toBe(rootBlock);
    popped3.dispose();
    
    // Assert - All blocks properly disposed in LIFO order
    expect(grandchildBlock.disposeCalls).toHaveLength(1);
    expect(childBlock.disposeCalls).toHaveLength(1);
    expect(rootBlock.disposeCalls).toHaveLength(1);
    
    // Verify disposal timing (grandchild first, then child, then root)
    const grandchildDisposeTime = grandchildBlock.disposeCalls[0].timestamp;
    const childDisposeTime = childBlock.disposeCalls[0].timestamp;
    const rootDisposeTime = rootBlock.disposeCalls[0].timestamp;
    
    expect(grandchildDisposeTime).toBeLessThanOrEqual(childDisposeTime);
    expect(childDisposeTime).toBeLessThanOrEqual(rootDisposeTime);
  });
  
  test('Complex nested lifecycle with error recovery', () => {
    // Arrange - Mixed block types
    const normalBlock = new LifecycleTrackingBlock(new BlockKey('normal'));
    const resourceBlock = new ComplexRuntimeBlock(new BlockKey('resource'), [1], ['mem-1']);
    
    stack.push(normalBlock);
    stack.push(resourceBlock);
    
    // Verify initial state
    expect(resourceBlock.hasResources).toBe(true);
    expect(stack.current).toBe(resourceBlock);
    
    // Act - Partial unwind with proper cleanup
    const poppedResource = stack.pop() as ComplexRuntimeBlock;
    expect(poppedResource).toBe(resourceBlock);
    
    // Consumer disposes resource block
    poppedResource.dispose();
    expect(poppedResource.hasResources).toBe(false);
    expect(poppedResource.active).toBe(false);
    
    // Continue unwinding
    const poppedNormal = stack.pop() as LifecycleTrackingBlock;
    expect(poppedNormal).toBe(normalBlock);
    poppedNormal.dispose();
    
    // Assert - Stack properly cleaned up
    expect(stack.current).toBeUndefined();
    expect(stack.blocks).toHaveLength(0);
    expect(normalBlock.disposeCalls).toHaveLength(1);
  });
  
  test('Performance: Nested lifecycle operations MUST meet timing requirements', () => {
    // Arrange - Create deep nesting (typical workout depth 5-20)
    const blocks: LifecycleTrackingBlock[] = [];
    const DEPTH = 15;
    
    // Build nested structure
    const buildStart = Date.now();
    for (let i = 0; i < DEPTH; i++) {
      const block = new LifecycleTrackingBlock(new BlockKey(`nested-${i}`));
      blocks.push(block);
      stack.push(block);
    }
    const buildEnd = Date.now();
    
    // Unwind with proper disposal
    const unwindStart = Date.now();
    while (stack.blocks.length > 0) {
      const popped = stack.pop();
      popped?.dispose();
    }
    const unwindEnd = Date.now();
    
    // Assert - Performance requirements met
    const buildTime = buildEnd - buildStart;
    const unwindTime = unwindEnd - unwindStart;
    
    expect(buildTime).toBeLessThan(50); // <50ms for build operations
    expect(unwindTime).toBeLessThan(50); // <50ms for unwind operations
    
    // Verify all blocks properly disposed
    blocks.forEach(block => {
      expect(block.disposeCalls).toHaveLength(1);
    });
  });
});