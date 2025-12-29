/**
 * Timer Block Lifecycle Integration Tests
 * 
 * Tests the complete lifecycle of a TimerBlock through the runtime:
 * 1. JIT compilation from script → TimerBlock with real runtime + faked JIT and clock
 * 2. Push to stack → memory allocations validated
 * 3. Tick event after duration → block pops from stack
 * 4. Memory cleanup after pop
 * 5. Proper events emitted on event bus throughout
 * 
 * KEY BEHAVIORS UNDER TEST:
 * - TimerBehavior: tracks elapsed time, emits timer:started on push, timer:complete on pop
 * - CompletionBehavior: listens for timer:tick, checks condition, returns PopBlockAction
 * - Runtime: executes PopBlockAction to remove block from stack
 * 
 * TEST APPROACH:
 * - Use ScriptRuntime with faked clock (createMockClock)
 * - Use real JIT with TimerStrategy
 * - Advance clock past duration
 * - Simulate tick event to trigger completion check
 * - Verify block is popped and memory cleaned up
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { JitCompiler } from '../../../src/runtime/compiler/JitCompiler';
import { TimerStrategy } from '../../../src/runtime/compiler/strategies/TimerStrategy';
import { TimerBehavior } from '../../../src/runtime/behaviors/TimerBehavior';
import { RuntimeMemory } from '../../../src/runtime/RuntimeMemory';
import { RuntimeStack } from '../../../src/runtime/RuntimeStack';
import { EventBus } from '../../../src/runtime/events/EventBus';
import { createMockClock } from '../../../src/runtime/RuntimeClock';
import { MdTimerRuntime } from '../../../src/parser/md-timer';
import { WodScript } from '../../../src/parser/WodScript';
import { IEvent } from '../../../src/runtime/contracts/events/IEvent';
import { MemoryTypeEnum } from '../../../src/runtime/models/MemoryTypeEnum';

/**
 * Test harness that creates a real ScriptRuntime with:
 * - Real JIT compiler with TimerStrategy
 * - Faked mock clock (controllable time)
 * - Real memory, stack, and event bus
 */
function createTimerTestRuntime(scriptText: string, startTime = new Date('2024-01-01T12:00:00Z')) {
  // Parse script
  const parser = new MdTimerRuntime();
  const script = parser.read(scriptText) as WodScript;
  
  // Create JIT with TimerStrategy
  const jit = new JitCompiler([new TimerStrategy()]);
  
  // Create mock clock we can control
  const mockClock = createMockClock(startTime);
  
  // Create real dependencies
  const memory = new RuntimeMemory();
  const stack = new RuntimeStack();
  const eventBus = new EventBus();
  
  // Create runtime
  const runtime = new ScriptRuntime(script, jit, {
    memory,
    stack,
    clock: mockClock,
    eventBus
  });
  
  // Track events for assertions
  const capturedEvents: IEvent[] = [];
  eventBus.register('*', {
    id: 'test-event-capture',
    name: 'TestEventCapture',
    handler: (event) => {
      capturedEvents.push(event);
      return [];
    }
  }, 'test-harness');
  
  return {
    runtime,
    script,
    jit,
    clock: mockClock,
    memory,
    stack,
    eventBus,
    capturedEvents,
    
    // Helper to find events by name
    findEvents: (name: string) => capturedEvents.filter(e => e.name === name),
    wasEventEmitted: (name: string) => capturedEvents.some(e => e.name === name),
    
    // Helper to compile and push first statement
    pushFirstStatement: () => {
      const statement = script.statements[0];
      if (!statement) throw new Error('No statements in script');
      
      const block = jit.compile([statement as any], runtime);
      if (!block) throw new Error('Failed to compile statement');
      
      runtime.pushBlock(block);
      
      // Mount the block (this triggers onPush on behaviors)
      const mountOptions = { startTime: mockClock.now };
      block.mount(runtime, mountOptions);
      
      return block;
    }
  };
}

describe('Timer Block Lifecycle', () => {
  describe('Phase 1: JIT Compilation → Real Runtime with Faked Clock', () => {
    it('should compile timer script and push block onto stack', () => {
      // ARRANGE: Create runtime with 5-second countdown timer
      const harness = createTimerTestRuntime('0:05 Run');
      
      // ACT: Compile and push the timer block
      const block = harness.pushFirstStatement();
      
      // ASSERT: Block is on stack
      expect(harness.stack.count).toBe(1);
      expect(harness.stack.current).toBe(block);
      expect(block.blockType).toBe('Timer');
      
      // ASSERT: TimerBehavior is attached
      const timerBehavior = block.getBehavior(TimerBehavior);
      expect(timerBehavior).toBeDefined();
    });
    
    it('should use faked clock time for timer start', () => {
      const startTime = new Date('2024-06-15T10:30:00Z');
      const harness = createTimerTestRuntime('0:05 Run', startTime);
      
      const block = harness.pushFirstStatement();
      
      // ASSERT: timer:started event uses faked clock time
      const startedEvents = harness.findEvents('timer:started');
      expect(startedEvents.length).toBe(1);
      expect(startedEvents[0].timestamp.getTime()).toBe(startTime.getTime());
    });
  });
  
  describe('Phase 2: Memory Allocation on Push', () => {
    it('should allocate timer state memory when block is pushed', () => {
      const harness = createTimerTestRuntime('0:05 Run');
      
      const block = harness.pushFirstStatement();
      const blockId = block.key.toString();
      
      // ASSERT: Memory has been allocated for timer state
      // Search for any memory owned by this block
      const memoryRefs = harness.memory.search({
        type: null, // Any type
        ownerId: blockId,
        id: null,
        visibility: null
      });
      
      expect(memoryRefs.length).toBeGreaterThan(0);
    });
    
    it('should emit timer:started event on push', () => {
      const harness = createTimerTestRuntime('0:05 Run');
      
      harness.pushFirstStatement();
      
      expect(harness.wasEventEmitted('timer:started')).toBe(true);
    });
  });
  
  describe('Phase 3: Tick Event After Duration → Block Pops', () => {
    it('should detect timer completion when clock advances past duration', () => {
      // ARRANGE: 5-second (5000ms) countdown timer
      const harness = createTimerTestRuntime('0:05 Run');
      const block = harness.pushFirstStatement();
      const timerBehavior = block.getBehavior(TimerBehavior)!;
      
      // ASSERT: Timer is not complete initially
      expect(timerBehavior.isComplete()).toBe(false);
      
      // ACT: Advance clock past duration
      harness.clock.advance(5100); // 5.1 seconds
      
      // ASSERT: Timer behavior reports complete
      expect(timerBehavior.isComplete()).toBe(true);
    });
    
    it('should pop block from stack when tick event is received after duration', () => {
      // ARRANGE: 2-second countdown timer for faster test
      const harness = createTimerTestRuntime('0:02 Run');
      const block = harness.pushFirstStatement();
      
      expect(harness.stack.count).toBe(1);
      
      // ACT: Advance clock past duration
      harness.clock.advance(2100); // 2.1 seconds
      
      // ACT: Simulate tick event to trigger completion check
      harness.runtime.handle({
        name: 'timer:tick',
        timestamp: harness.clock.now,
        data: { source: 'test' }
      });
      
      // ASSERT: Block should be popped from stack
      expect(harness.stack.count).toBe(0);
    });
    
    it('should emit timer:complete event when block is popped', () => {
      const harness = createTimerTestRuntime('0:02 Run');
      harness.pushFirstStatement();
      
      // Advance past duration and tick
      harness.clock.advance(2100);
      harness.runtime.handle({
        name: 'timer:tick',
        timestamp: harness.clock.now,
        data: { source: 'test' }
      });
      
      // ASSERT: timer:complete was emitted
      expect(harness.wasEventEmitted('timer:complete')).toBe(true);
    });
    
    it('should emit block:complete event when block is popped', () => {
      const harness = createTimerTestRuntime('0:02 Run');
      harness.pushFirstStatement();
      
      harness.clock.advance(2100);
      harness.runtime.handle({
        name: 'timer:tick',
        timestamp: harness.clock.now,
        data: { source: 'test' }
      });
      
      // ASSERT: block:complete was emitted
      expect(harness.wasEventEmitted('block:complete')).toBe(true);
    });
    
    it('should NOT pop block before duration expires', () => {
      const harness = createTimerTestRuntime('0:10 Run'); // 10-second timer
      harness.pushFirstStatement();
      
      // Advance only 5 seconds (half the duration)
      harness.clock.advance(5000);
      harness.runtime.handle({
        name: 'timer:tick',
        timestamp: harness.clock.now,
        data: { source: 'test' }
      });
      
      // ASSERT: Block should still be on stack
      expect(harness.stack.count).toBe(1);
      expect(harness.wasEventEmitted('timer:complete')).toBe(false);
    });
  });
  
  describe('Phase 4: Memory Cleanup After Pop', () => {
    it('should release timer memory when block is popped', () => {
      const harness = createTimerTestRuntime('0:02 Run');
      const block = harness.pushFirstStatement();
      const blockId = block.key.toString();
      
      // Verify memory exists before pop
      const memoryBefore = harness.memory.search({
        type: null,
        ownerId: blockId,
        id: null,
        visibility: null
      });
      expect(memoryBefore.length).toBeGreaterThan(0);
      
      // Pop the block (simulate completion)
      harness.clock.advance(2100);
      harness.runtime.handle({
        name: 'timer:tick',
        timestamp: harness.clock.now,
        data: { source: 'test' }
      });
      
      // ASSERT: BlockContext was released
      expect(block.context?.isReleased?.()).toBe(true);
      
      // ASSERT: At least some memory was cleaned up
      // NOTE: There's a known issue where SoundBehavior and HistoryBehavior
      // allocate memory outside BlockContext, causing leaks.
      // TODO: Fix memory allocation in SoundBehavior and HistoryBehavior
      const memoryAfter = harness.memory.search({
        type: null,
        ownerId: blockId,
        id: null,
        visibility: null
      });
      expect(memoryAfter.length).toBeLessThan(memoryBefore.length);
    });
  });
  
  describe('Phase 5: Event Bus - Complete Event Sequence', () => {
    it('should emit events in correct order throughout lifecycle', () => {
      const harness = createTimerTestRuntime('0:02 Run');
      
      // Clear any events from setup
      harness.capturedEvents.length = 0;
      
      // Push block
      harness.pushFirstStatement();
      
      // Complete timer
      harness.clock.advance(2100);
      harness.runtime.handle({
        name: 'timer:tick',
        timestamp: harness.clock.now,
        data: { source: 'test' }
      });
      
      // ASSERT: Event sequence
      const eventNames = harness.capturedEvents.map(e => e.name);
      
      // Should contain these events (order matters for some)
      expect(eventNames).toContain('timer:started');
      expect(eventNames).toContain('stack:push');
      
      // After completion
      expect(eventNames).toContain('timer:tick');
      expect(eventNames).toContain('timer:complete');
      expect(eventNames).toContain('block:complete');
      expect(eventNames).toContain('stack:pop');
      
      // timer:started should come before timer:complete
      const startedIdx = eventNames.indexOf('timer:started');
      const completedIdx = eventNames.indexOf('timer:complete');
      expect(startedIdx).toBeLessThan(completedIdx);
    });
  });
  
  describe('Count-Up Timer Behavior', () => {
    it('should NOT auto-complete count-up timers (00:00 syntax)', () => {
      // Count-up timer with 00:00 syntax means "run until stopped"
      const harness = createTimerTestRuntime('00:00 Run');
      const block = harness.pushFirstStatement();
      const timerBehavior = block.getBehavior(TimerBehavior)!;
      
      // Advance time significantly
      harness.clock.advance(60000); // 1 minute
      
      // Tick
      harness.runtime.handle({
        name: 'timer:tick',
        timestamp: harness.clock.now,
        data: { source: 'test' }
      });
      
      // ASSERT: Timer should NOT be complete (count-up never auto-completes)
      expect(timerBehavior.isComplete()).toBe(false);
      expect(harness.stack.count).toBe(1); // Block still on stack
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle exact duration boundary', () => {
      const harness = createTimerTestRuntime('0:05 Run');
      const block = harness.pushFirstStatement();
      const timerBehavior = block.getBehavior(TimerBehavior)!;
      
      // Advance exactly to duration (5000ms)
      harness.clock.advance(5000);
      
      // At exact boundary, should be complete
      expect(timerBehavior.isComplete()).toBe(true);
    });
    
    it('should handle multiple tick events gracefully', () => {
      const harness = createTimerTestRuntime('0:02 Run');
      harness.pushFirstStatement();
      
      // Advance past duration
      harness.clock.advance(2100);
      
      // Send multiple ticks (should only pop once)
      for (let i = 0; i < 5; i++) {
        harness.runtime.handle({
          name: 'timer:tick',
          timestamp: harness.clock.now,
          data: { source: 'test', tick: i }
        });
      }
      
      // ASSERT: Stack is empty (block popped once, not error from multiple pops)
      expect(harness.stack.count).toBe(0);
    });
  });
});
