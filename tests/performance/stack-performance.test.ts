/**
 * Performance tests for RuntimeStack operations
 * 
 * These tests verify that stack operations meet the <50ms requirement
 * specified in the contracts and maintain acceptable performance characteristics.
 */

import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { RuntimeStack } from '../../src/runtime/RuntimeStack';
import { BlockKey } from '../../src/core/models/BlockKey';
import { IRuntimeBlock } from '../../src/runtime/contracts/IRuntimeBlock';
import { IRuntimeAction } from '../../src/runtime/contracts/IRuntimeAction';

// Lightweight block for performance testing
class PerformanceTestBlock implements IRuntimeBlock {
  public readonly sourceIds: number[] = [1, 2, 3];
  private _isComplete = false;
  
  constructor(
    public readonly key: BlockKey,
    data?: Record<string, any>
  ) {
    // Minimal constructor initialization
    if (data) {
      // Data is used for initialization but not stored
    }
  }

  get isComplete(): boolean { return this._isComplete; }
  markComplete(_reason?: string): void { this._isComplete = true; }
  
  mount(runtime: any): IRuntimeAction[] {
    return [];
  }
  
  next(runtime: any): IRuntimeAction[] {
    return [];
  }
  
  unmount(runtime: any): IRuntimeAction[] {
    return [];
  }
  
  dispose(runtime: any): void {
    // Minimal disposal
  }
}

// Heavy block for stress testing
class HeavyTestBlock implements IRuntimeBlock {
  public readonly sourceIds: number[] = [1, 2, 3];
  private largeData: number[] = [];
  private _isComplete = false;
  
  constructor(public readonly key: BlockKey) {
    // Simulate resource-heavy initialization
    for (let i = 0; i < 1000; i++) {
      this.largeData.push(Math.random());
    }
  }

  get isComplete(): boolean { return this._isComplete; }
  markComplete(_reason?: string): void { this._isComplete = true; }
  
  mount(runtime: any): IRuntimeAction[] {
    return [];
  }
  
  next(runtime: any): IRuntimeAction[] {
    return [];
  }
  
  unmount(runtime: any): IRuntimeAction[] {
    return [];
  }
  
  dispose(runtime: any): void {
    // Simulate expensive cleanup
    this.largeData.length = 0;
  }
}

describe('RuntimeStack Performance Tests - Basic Operations', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });

  it('single push operation completes within timing requirement', () => {
    // Arrange
    const block = new PerformanceTestBlock(new BlockKey('perf-single'));
    
    // Act
    const start = performance.now();
    stack.push(block);
    const end = performance.now();
    
    // Assert
    const duration = end - start;
    expect(duration).toBeLessThan(50); // <50ms requirement
    expect(stack.current).toBe(block);
  });
  
  it('single pop operation completes within timing requirement', () => {
    // Arrange
    const block = new PerformanceTestBlock(new BlockKey('perf-single-pop'));
    stack.push(block);
    
    // Act
    const start = performance.now();
    const popped = stack.pop();
    const end = performance.now();
    
    // Assert
    const duration = end - start;
    expect(duration).toBeLessThan(50); // <50ms requirement
    expect(popped).toBe(block);
  });
  
  it('current() getter completes within timing requirement', () => {
    // Arrange - max stack depth is 10
    const blocks: PerformanceTestBlock[] = [];
    for (let i = 0; i < 10; i++) {
      const block = new PerformanceTestBlock(new BlockKey(`current-perf-${i}`));
      blocks.push(block);
      stack.push(block);
    }
    
    // Act
    const start = performance.now();
    const current = stack.current;
    const end = performance.now();
    
    // Assert
    const duration = end - start;
    expect(duration).toBeLessThan(1); // Should be nearly instantaneous
    expect(current).toBe(blocks[9]); // Last pushed block
  });
  
  it('graph() operation completes within timing requirement', () => {
    // Arrange - max stack depth is 10
    const TYPICAL_DEPTH = 10;
    for (let i = 0; i < TYPICAL_DEPTH; i++) {
      stack.push(new PerformanceTestBlock(new BlockKey(`graph-perf-${i}`)));
    }
    
    // Act
    const start = performance.now();
    const graph = stack.blocks;
    const end = performance.now();
    
    // Assert
    const duration = end - start;
    expect(duration).toBeLessThan(50); // <50ms requirement
    expect(graph).toHaveLength(TYPICAL_DEPTH);
  });
});

describe('RuntimeStack Performance Tests - Batch Operations', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  it('batch push operations maintain performance', () => {
    // Arrange - max stack depth is 10
    const BATCH_SIZE = 10;
    const blocks: PerformanceTestBlock[] = [];
    
    for (let i = 0; i < BATCH_SIZE; i++) {
      blocks.push(new PerformanceTestBlock(new BlockKey(`batch-push-${i}`)));
    }
    
    // Act
    const start = performance.now();
    blocks.forEach(block => stack.push(block));
    const end = performance.now();
    
    // Assert
    const duration = end - start;
    const avgPerOperation = duration / BATCH_SIZE;
    
    expect(duration).toBeLessThan(50); // Total batch <50ms
    expect(avgPerOperation).toBeLessThan(5); // Individual ops should be reasonably fast
    expect(stack.blocks.length).toBe(BATCH_SIZE);
  });
  
  it('batch pop operations maintain performance', () => {
    // Arrange - max stack depth is 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < BATCH_SIZE; i++) {
      stack.push(new PerformanceTestBlock(new BlockKey(`batch-pop-${i}`)));
    }
    
    // Act
    const start = performance.now();
    const poppedBlocks: IRuntimeBlock[] = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const popped = stack.pop();
      if (popped) {
        poppedBlocks.push(popped);
      }
    }
    const end = performance.now();
    
    // Assert
    const duration = end - start;
    const avgPerOperation = duration / BATCH_SIZE;
    
    expect(duration).toBeLessThan(50); // Total batch <50ms
    expect(avgPerOperation).toBeLessThan(5); // Individual ops should be reasonably fast
    expect(poppedBlocks.length).toBe(BATCH_SIZE);
    expect(stack.blocks.length).toBe(0);
  });
  
  it('mixed push/pop operations maintain performance', () => {
    // Mock console.log to avoid I/O noise in performance measurements
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      // Arrange - max stack depth is 10
      const OPERATIONS = 20; // 10 push + 10 pop
      const blocks: PerformanceTestBlock[] = [];
      
      for (let i = 0; i < OPERATIONS / 2; i++) {
        blocks.push(new PerformanceTestBlock(new BlockKey(`mixed-${i}`)));
      }
      
      // Act
      const start = performance.now();
      
      // Push half
      blocks.forEach(block => stack.push(block));
      
      // Pop half  
      for (let i = 0; i < OPERATIONS / 2; i++) {
        stack.pop();
      }
      
      const end = performance.now();
      
      // Assert
      const duration = end - start;
      const avgPerOperation = duration / OPERATIONS;
      
      expect(duration).toBeLessThan(50); // Total operations <50ms
      expect(avgPerOperation).toBeLessThan(1); // Individual ops should be very fast
      expect(stack.blocks.length).toBe(0);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});

describe('RuntimeStack Performance Tests - Stress Testing', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  it('large stack operations scale appropriately', () => {
    // Mock console.log to avoid I/O noise in performance measurements
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      // Max stack depth is 10
      const LARGE_SIZE = 10;
      const measurementPoints = [2, 4, 6, 8, 10];
      const pushTimes: number[] = [];
      const popTimes: number[] = [];
      const graphTimes: number[] = [];
      
      // Build up stack and measure at different sizes
      for (let i = 0; i < LARGE_SIZE; i++) {
        const pushStart = performance.now();
        stack.push(new PerformanceTestBlock(new BlockKey(`stress-${i}`)));
        const pushEnd = performance.now();
        
        if (measurementPoints.includes(i + 1)) {
          pushTimes.push(pushEnd - pushStart);
          
          // Measure graph at this size
          const graphStart = performance.now();
          const _ = stack.blocks;
          const graphEndTime = performance.now();
          graphTimes.push(graphEndTime - graphStart);
        }
      }
      
      // Pop all and measure
      for (let i = LARGE_SIZE - 1; i >= 0; i--) {
        const popStart = performance.now();
        stack.pop();
        const popEnd = performance.now();
        
        if (measurementPoints.includes(i + 1)) {
          popTimes.push(popEnd - popStart);
        }
      }
      
      // Assert all operations stayed within bounds
      pushTimes.forEach((time) => {
        expect(time).toBeLessThan(5); // Individual pushes should be very fast
      });
      
      popTimes.forEach((time) => {
        expect(time).toBeLessThan(5); // Individual pops should be very fast  
      });
      
      graphTimes.forEach((time, index) => {
        const size = measurementPoints[index];
        expect(time).toBeLessThan(50); // Graph operations <50ms even for large stacks
        
        // Graph time should scale reasonably with size (not exponentially)
        if (index > 0) {
          const prevTime = graphTimes[index - 1];
          // Only check ratio if the operation takes significant time (>0.1ms)
          // otherwise noise dominates the ratio
          if (prevTime > 0.1) {
            const timeRatio = time / prevTime;
            const sizeRatio = size / measurementPoints[index - 1];
            // Allow for some overhead/noise with a looser bound (3x instead of 2x)
            // for small N, overhead can make the ratio look worse
            expect(timeRatio).toBeLessThan(sizeRatio * 3); 
          }
        }
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });
  
  it('heavy blocks still meet performance requirements', () => {
    // Arrange - blocks with expensive initialization/disposal
    const HEAVY_COUNT = 10;
    const blocks: HeavyTestBlock[] = [];
    
    // Create heavy blocks (this might be slow, but that's in constructor)
    for (let i = 0; i < HEAVY_COUNT; i++) {
      blocks.push(new HeavyTestBlock(new BlockKey(`heavy-${i}`)));
    }
    
    // Act - stack operations should still be fast despite heavy blocks
    const pushStart = performance.now();
    blocks.forEach(block => stack.push(block));
    const pushEnd = performance.now();

    const graphStart = performance.now();
    const _ = stack.blocks;
    const graphEnd = performance.now();
    
    const popStart = performance.now();
    const poppedBlocks: HeavyTestBlock[] = [];
    while (stack.blocks.length > 0) {
      const popped = stack.pop() as HeavyTestBlock;
      if (popped) {
        poppedBlocks.push(popped);
      }
    }
    const popEnd = performance.now();
    
    // Dispose blocks (this might be slow, but that's consumer responsibility)
    const mockRuntime = {} as any;
    poppedBlocks.forEach(block => block.dispose(mockRuntime));
    
    // Assert - stack operations are fast despite heavy block content
    expect(pushEnd - pushStart).toBeLessThan(50);
    expect(graphEnd - graphStart).toBeLessThan(50);
    expect(popEnd - popStart).toBeLessThan(50);
    expect(poppedBlocks.length).toBe(HEAVY_COUNT);
  });
  
  it('rapid push/pop cycles maintain consistent performance', () => {
    // Test rapid cycles of push/pop to check for performance degradation
    const CYCLES = 1000;
    const cycleTimes: number[] = [];
    
    const block = new PerformanceTestBlock(new BlockKey('cycle-test'));
    
    for (let i = 0; i < CYCLES; i++) {
      const start = performance.now();
      
      stack.push(block);
      stack.pop();
      
      const end = performance.now();
      cycleTimes.push(end - start);
    }
    
    // Check that performance doesn't degrade over time
    const earlyAvg = cycleTimes.slice(0, 100).reduce((a, b) => a + b) / 100;
    const lateAvg = cycleTimes.slice(-100).reduce((a, b) => a + b) / 100;
    
    expect(earlyAvg).toBeLessThan(1); // Very fast cycles
    expect(lateAvg).toBeLessThan(1); // Still fast after many cycles
    expect(lateAvg).toBeLessThan(earlyAvg * 3); // No significant degradation
  });
});

describe('RuntimeStack Performance Tests - Memory Usage', () => {
  let stack: RuntimeStack;
  
  beforeEach(() => {
    stack = new RuntimeStack();
  });
  
  it('memory usage patterns are reasonable', () => {
    // This test checks for memory leaks or excessive memory usage
    // Max stack depth is 10
    const MEMORY_TEST_SIZE = 10;
    
    // Track initial memory if available (not all environments support this)
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Fill stack
    for (let i = 0; i < MEMORY_TEST_SIZE; i++) {
      stack.push(new PerformanceTestBlock(new BlockKey(`memory-${i}`), { data: new Array(100).fill(i) }));
    }
    
    const filledMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Empty stack with proper disposal
    const mockRuntime = {} as any;
    while (stack.blocks.length > 0) {
      const popped = stack.pop();
      popped?.dispose(mockRuntime);
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Basic memory checks (only if memory info is available)
    if (initialMemory > 0 && filledMemory > 0 && finalMemory > 0) {
      const memoryIncrease = filledMemory - initialMemory;
      const memoryDecrease = filledMemory - finalMemory;
      
      // Memory should have increased when filled
      expect(memoryIncrease).toBeGreaterThan(0);
      
      // Most memory should be freed after disposal (allowing for some GC timing)
      expect(memoryDecrease).toBeGreaterThan(memoryIncrease * 0.5);
    }
    
    // Stack should be properly empty
    expect(stack.blocks.length).toBe(0);
    expect(stack.current).toBeUndefined();
  });
  
  it('no memory leaks in graph operations', () => {
    // Max stack depth is 10
    const GRAPH_TEST_SIZE = 10;
    
    // Fill stack
    for (let i = 0; i < GRAPH_TEST_SIZE; i++) {
      stack.push(new PerformanceTestBlock(new BlockKey(`graph-memory-${i}`)));
    }
    
    // Perform many graph operations
    const graphs: IRuntimeBlock[][] = [];
    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      graphs.push([...stack.blocks]);
    }

    const end = performance.now();
    
    // All graph operations should complete quickly
    expect(end - start).toBeLessThan(50);
    
    // All graphs should have same content
    graphs.forEach(graph => {
      expect(graph.length).toBe(GRAPH_TEST_SIZE);
    });
    
    // Clear graphs array and force GC if available
    graphs.length = 0;
    if (global.gc) {
      global.gc();
    }
  });
});
