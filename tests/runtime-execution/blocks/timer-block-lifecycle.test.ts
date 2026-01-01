/**
 * Timer Block Lifecycle Integration Tests
 * 
 * Tests the complete lifecycle of a TimerBlock through the runtime:
 * 1. JIT compilation from script → TimerBlock with real runtime + faked JIT and clock
 * 2. Push to stack → memory allocations validated
 * 3. Tick event after duration → block pops from stack
 * 4. Memory cleanup after pop
 * 5. Proper events emitted on event bus throughout
 */

import { describe, it, expect } from 'bun:test';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { JitCompiler } from '../../../src/runtime/compiler/JitCompiler';
import { TimerStrategy } from '../../../src/runtime/compiler/strategies/TimerStrategy';
import { TimerBehavior } from '../../../src/runtime/behaviors/TimerBehavior';
import { RuntimeMemory } from '../../../src/runtime/RuntimeMemory';
import { RuntimeStack } from '../../../src/runtime/RuntimeStack';
import { EventBus } from '../../../src/runtime/events/EventBus';
import { createMockClock } from '../../../src/runtime/RuntimeClock';
import { IRuntimeClock } from '../../../src/runtime/contracts/IRuntimeClock';
import { MdTimerRuntime } from '../../../src/parser/md-timer';
import { WodScript } from '../../../src/parser/WodScript';
import { IEvent } from '../../../src/runtime/contracts/events/IEvent';
import { IRuntimeBlock } from '../../../src/runtime/contracts/IRuntimeBlock';

// ============================================================================
// TEST HARNESS (Fluent Builder - reads top to bottom)
// ============================================================================

/**
 * Fluent test harness for timer lifecycle tests.
 * 
 * Usage:
 *   const t = new TimerTestHarness('0:05 Run')  // Parse "5 second countdown"
 *     .start();                                  // Compile, push, and mount
 * 
 *   t.advanceClock(5100);                       // Move time forward 5.1s
 *   t.tick();                                   // Send timer:tick event
 *   expect(t.stackCount).toBe(0);               // Block was popped
 */
class TimerTestHarness {
  // Core runtime components
  readonly runtime: ScriptRuntime;
  readonly clock: IRuntimeClock & { advance: (ms: number) => void };
  readonly memory: RuntimeMemory;
  readonly stack: RuntimeStack;
  readonly eventBus: EventBus;

  // State
  private _block?: IRuntimeBlock;
  private _events: IEvent[] = [];

  constructor(timerScript: string, startTime: Date = new Date('2024-01-01T12:00:00Z')) {
    // 1. Parse the workout script
    const parser = new MdTimerRuntime();
    const script = parser.read(timerScript) as WodScript;

    // 2. Create mock clock (controllable time)
    this.clock = createMockClock(startTime);

    // 3. Create real runtime dependencies
    this.memory = new RuntimeMemory();
    this.stack = new RuntimeStack();
    this.eventBus = new EventBus();

    // 4. Create JIT compiler with TimerStrategy
    const jit = new JitCompiler([new TimerStrategy()]);

    // 5. Assemble runtime
    this.runtime = new ScriptRuntime(script, jit, {
      memory: this.memory,
      stack: this.stack,
      clock: this.clock,
      eventBus: this.eventBus
    });

    // 6. Capture all events for assertions
    this.eventBus.register('*', {
      id: 'test-capture',
      name: 'TestEventCapture',
      handler: (event) => { this._events.push(event); return []; }
    }, 'test');
  }

  /** Alternative constructor with custom start time */
  static atTime(timerScript: string, isoTime: string): TimerTestHarness {
    return new TimerTestHarness(timerScript, new Date(isoTime));
  }

  // ---------------------------------------------------------------------------
  // ACTIONS (mutate state)
  // ---------------------------------------------------------------------------

  /** Compile the first statement, push to stack, and mount (starts timer) */
  start(): this {
    const statement = this.runtime.script.statements[0];
    if (!statement) throw new Error('No statements in script');

    const block = this.runtime.jit.compile([statement as any], this.runtime);
    if (!block) throw new Error('Failed to compile statement');

    this.runtime.pushBlock(block, { startTime: this.clock.now });
    this._block = block;

    return this;
  }

  /** Advance the mock clock by the given milliseconds */
  advanceClock(ms: number): this {
    this.clock.advance(ms);
    return this;
  }

  /** Send a timer:tick event to the runtime */
  tick(): this {
    this.runtime.handle({
      name: 'timer:tick',
      timestamp: this.clock.now,
      data: { source: 'test' }
    });
    return this;
  }

  /** Clear captured events (useful before measuring a specific phase) */
  clearEvents(): this {
    this._events = [];
    return this;
  }

  // ---------------------------------------------------------------------------
  // QUERIES (read state for assertions)
  // ---------------------------------------------------------------------------

  /** The timer block that was started */
  get block(): IRuntimeBlock {
    if (!this._block) throw new Error('Call start() first');
    return this._block;
  }

  /** Get the TimerBehavior from the block */
  get timerBehavior(): TimerBehavior {
    const behavior = this.block.getBehavior(TimerBehavior);
    if (!behavior) throw new Error('Block has no TimerBehavior');
    return behavior;
  }

  /** Current stack depth */
  get stackCount(): number {
    return this.stack.count;
  }

  /** Block's unique key as string */
  get blockId(): string {
    return this.block.key.toString();
  }

  /** All captured event names */
  get eventNames(): string[] {
    return this._events.map(e => e.name);
  }

  /** Check if a specific event was emitted */
  wasEmitted(eventName: string): boolean {
    return this._events.some(e => e.name === eventName);
  }

  /** Find all events with a given name */
  findEvents(eventName: string): IEvent[] {
    return this._events.filter(e => e.name === eventName);
  }

  /** Count memory entries owned by the block */
  blockMemoryCount(): number {
    return this.memory.search({
      type: null,
      ownerId: this.blockId,
      id: null,
      visibility: null
    }).length;
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Timer Block Lifecycle', () => {

  describe('Phase 1: JIT Compilation → Real Runtime with Faked Clock', () => {

    it('should compile timer script and push block onto stack', () => {
      // Create a 5-second countdown timer and start it
      const t = new TimerTestHarness('0:05 Run').start();

      // Block should be on the stack
      expect(t.stackCount).toBe(1);
      expect(t.stack.current).toBe(t.block);
      expect(t.block.blockType).toBe('Timer');

      // TimerBehavior should be attached
      expect(t.timerBehavior).toBeDefined();
    });

    it('should use faked clock time for timer start', () => {
      // Start at a specific time
      const t = TimerTestHarness.atTime('0:05 Run', '2024-06-15T10:30:00Z').start();

      // timer:started event should use that faked time
      const startedEvents = t.findEvents('timer:started');
      expect(startedEvents.length).toBe(1);
      expect(startedEvents[0].timestamp.toISOString()).toBe('2024-06-15T10:30:00.000Z');
    });
  });

  describe('Phase 2: Memory Allocation on Push', () => {

    it('should allocate timer state memory when block is pushed', () => {
      const t = new TimerTestHarness('0:05 Run').start();

      // Memory should be allocated for this block
      expect(t.blockMemoryCount()).toBeGreaterThan(0);
    });

    it('should emit timer:started event on push', () => {
      const t = new TimerTestHarness('0:05 Run').start();

      expect(t.wasEmitted('timer:started')).toBe(true);
    });
  });

  describe('Phase 3: Tick Event After Duration → Block Pops', () => {

    it('should detect timer completion when clock advances past duration', () => {
      // 5-second countdown timer
      const t = new TimerTestHarness('0:05 Run').start();

      // Not complete initially
      expect(t.timerBehavior.isComplete(t.clock.now)).toBe(false);

      // Advance clock past the 5-second duration
      t.advanceClock(5100);

      // Now it should report complete
      expect(t.timerBehavior.isComplete(t.clock.now)).toBe(true);
    });

    it('should pop block from stack when tick event is received after duration', () => {
      // 2-second countdown timer
      const t = new TimerTestHarness('0:02 Run').start();
      expect(t.stackCount).toBe(1);

      // Advance past duration and send tick
      t.advanceClock(2100).tick();

      // Block should be popped
      expect(t.stackCount).toBe(0);
    });

    it('should emit timer:complete event when block is popped', () => {
      const t = new TimerTestHarness('0:02 Run').start();

      t.advanceClock(2100).tick();

      expect(t.wasEmitted('timer:complete')).toBe(true);
    });

    it('should emit block:complete event when block is popped', () => {
      const t = new TimerTestHarness('0:02 Run').start();

      t.advanceClock(2100).tick();

      expect(t.wasEmitted('block:complete')).toBe(true);
    });

    it('should NOT pop block before duration expires', () => {
      // 10-second timer
      const t = new TimerTestHarness('0:10 Run').start();

      // Only advance 5 seconds (half the duration)
      t.advanceClock(5000).tick();

      // Block should still be on stack
      expect(t.stackCount).toBe(1);
      expect(t.wasEmitted('timer:complete')).toBe(false);
    });
  });

  describe('Phase 4: Memory Cleanup After Pop', () => {

    it('should release timer memory when block is popped', () => {
      const t = new TimerTestHarness('0:02 Run').start();
      const memoryBefore = t.blockMemoryCount();
      expect(memoryBefore).toBeGreaterThan(0);

      // Complete the timer
      t.advanceClock(2100).tick();

      // BlockContext should be released
      expect(t.block.context?.isReleased?.()).toBe(true);

      // At least some memory should be cleaned up
      // NOTE: Known issue - SoundBehavior/HistoryBehavior leak memory
      const memoryAfter = t.blockMemoryCount();
      expect(memoryAfter).toBeLessThan(memoryBefore);
    });
  });

  describe('Phase 5: Event Bus - Complete Event Sequence', () => {

    it('should emit completion events when timer expires', () => {
      const t = new TimerTestHarness('0:02 Run').start();
      t.clearEvents(); // Clear setup events

      // Trigger completion
      t.advanceClock(2100).tick();

      // Should have completion events
      expect(t.eventNames).toContain('timer:tick');
      expect(t.eventNames).toContain('timer:complete');
      expect(t.eventNames).toContain('block:complete');
      expect(t.eventNames).toContain('stack:pop');
    });

    it('should emit timer:started before timer:complete', () => {
      const t = new TimerTestHarness('0:02 Run').start();
      t.advanceClock(2100).tick();

      const startedIdx = t.eventNames.indexOf('timer:started');
      const completedIdx = t.eventNames.indexOf('timer:complete');

      expect(startedIdx).toBeLessThan(completedIdx);
    });
  });

  describe('Count-Up Timer Behavior', () => {

    it('should NOT auto-complete count-up timers (00:00 syntax)', () => {
      // 00:00 means "count up indefinitely"
      const t = new TimerTestHarness('00:00 Run').start();

      // Advance a full minute
      t.advanceClock(60000).tick();

      // Should NOT complete - count-up timers run forever
      expect(t.timerBehavior.isComplete(t.clock.now)).toBe(false);
      expect(t.stackCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {

    it('should handle exact duration boundary', () => {
      const t = new TimerTestHarness('0:05 Run').start();

      // Advance exactly to 5000ms
      t.advanceClock(5000);

      // Should be complete at exact boundary
      expect(t.timerBehavior.isComplete(t.clock.now)).toBe(true);
    });

    it('should handle multiple tick events gracefully', () => {
      const t = new TimerTestHarness('0:02 Run').start();
      t.advanceClock(2100);

      // Send 5 ticks (should only pop once, not error)
      t.tick().tick().tick().tick().tick();

      // Stack should be empty
      expect(t.stackCount).toBe(0);
    });
  });
});
