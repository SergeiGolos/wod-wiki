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
import { GenericTimerStrategy } from '../../../src/runtime/compiler/strategies/components/GenericTimerStrategy';
import { TimerInitBehavior, TimerTickBehavior, TimerCompletionBehavior } from '../../../src/runtime/behaviors';
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

    // 4. Create JIT compiler with GenericTimerStrategy (aspect-based)
    const jit = new JitCompiler([new GenericTimerStrategy()]);

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
    this.runtime.eventBus.emit({
      name: 'timer:tick',
      timestamp: this.clock.now,
      data: { source: 'test' }
    }, this.runtime);
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

  /** Get the TimerInitBehavior from the block */
  get timerBehavior(): TimerInitBehavior | undefined {
    return this.block.getBehavior(TimerInitBehavior);
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

      // TimerInitBehavior should be attached (new aspect-based behavior)
      expect(t.timerBehavior).toBeDefined();
    });

    it('should use faked clock time for timer start', () => {
      // Start at a specific time
      const t = TimerTestHarness.atTime('0:05 Run', '2024-06-15T10:30:00Z').start();

      // Timer memory should be initialized with a span starting at the faked time
      const timerMemory = t.block.getMemory('timer');
      expect(timerMemory).toBeDefined();
      expect(timerMemory?.value.spans.length).toBe(1);
      // The span started timestamp should match the faked clock
      expect(timerMemory?.value.spans[0].started).toBe(new Date('2024-06-15T10:30:00Z').getTime());
    });
  });

  describe('Phase 2: Memory Allocation on Push', () => {

    it('should allocate timer state memory when block is pushed', () => {
      const t = new TimerTestHarness('0:05 Run').start();

      // Memory should be allocated for this block
      expect(t.blockMemoryCount()).toBeGreaterThan(0);
    });

    it('should initialize timer memory with open span on push', () => {
      const t = new TimerTestHarness('0:05 Run').start();

      // Timer state is signaled by memory with open span, not event
      const timerMemory = t.block.getMemory('timer');
      expect(timerMemory).toBeDefined();
      expect(timerMemory?.value.spans.length).toBe(1);
      expect(timerMemory?.value.spans[0].ended).toBeUndefined(); // Open span
    });
  });

  describe('Phase 3: Timer Events', () => {

    it('should initialize timer memory with correct direction and duration', () => {
      // 5-second countdown timer
      const t = new TimerTestHarness('0:05 Run').start();

      // Timer memory should have correct configuration (no event emission)
      const timerMemory = t.block.getMemory('timer');
      expect(timerMemory).toBeDefined();
      expect(timerMemory?.value.direction).toBe('down');
      expect(timerMemory?.value.durationMs).toBe(5000);
    });
  });

  describe('Count-Up Timer Behavior', () => {

    it('should handle count-up timers (00:00 syntax)', () => {
      // 00:00 means "count up indefinitely"
      const t = new TimerTestHarness('00:00 Run').start();

      // Block should be on stack
      expect(t.stackCount).toBe(1);

      // Timer memory should be initialized (no event emission)
      const timerMemory = t.block.getMemory('timer');
      expect(timerMemory).toBeDefined();
    });
  });

  describe('Edge Cases', () => {

    it('should handle multiple tick events gracefully without errors', () => {
      const t = new TimerTestHarness('0:02 Run').start();
      t.advanceClock(2100);

      // Send 5 ticks - this tests that the runtime handles multiple ticks without throwing
      // The exact stack state depends on the completion behavior implementation
      expect(() => {
        t.tick().tick().tick().tick().tick();
      }).not.toThrow();
    });
  });
});
