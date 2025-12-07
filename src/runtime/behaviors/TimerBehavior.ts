import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { TimerSpan } from '../models/MemoryModels';
export type TimeSpan = TimerSpan;
import { ITickable } from '../ITickable';
import { calculateDuration } from '../../lib/timeUtils';
import { TimerStateManager } from './TimerStateManager';

/**
 * TimerBehavior manages time tracking for workout blocks.
 * 
 * Supports two modes:
 * - Count-up ('up'): Timer starts at 0 and increases (For Time workouts)
 * - Countdown ('down'): Timer starts at duration and decreases to 0 (AMRAP workouts)
 * 
 * Features:
 * - Emits timer:tick events every ~100ms for UI updates
 * - Emits timer:complete when countdown reaches zero
 * - Supports pause/resume via behavior methods
 * - Uses Unified Clock (RuntimeClock) for time management
 * - Automatically cleans up on disposal
 * 
 * API Contract: contracts/runtime-blocks-api.md
 */
export class TimerBehavior implements IRuntimeBehavior, ITickable {
  private startTime = 0;
  private elapsedMs = 0;
  private _isPaused = false;
  private pauseTime = 0;
  private readonly tickIntervalMs = 100; // ~10 ticks per second
  private lastTickTime = 0;
  private _runtime?: IScriptRuntime;
  private stateManager: TimerStateManager;

  /**
   * Creates a new TimerBehavior with optional memory injection.
   * 
   * @param direction Timer direction ('up' for count-up, 'down' for countdown)
   * @param durationMs Duration in milliseconds (for countdown timers)
   * @param label Optional label for the timer
   */
  constructor(
    private readonly direction: 'up' | 'down' = 'up',
    private readonly durationMs?: number,
    private readonly label: string = 'Timer',
    private readonly role: 'primary' | 'secondary' | 'auto' = 'auto',
    private readonly autoStart: boolean = true
  ) {
    if (direction !== 'up' && direction !== 'down') {
      throw new TypeError(`Invalid timer direction: ${direction}. Must be 'up' or 'down'.`);
    }
    this.stateManager = new TimerStateManager(direction, durationMs, label);
  }

  /**
   * Start the timer when block is pushed onto the stack.
   * Initializes memory references and emits timer:started event.
   */
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    this._runtime = runtime;
    this.startTime = runtime.clock.now;
    this.elapsedMs = 0;
    this._isPaused = !this.autoStart; // Initialize paused state based on autoStart
    this.lastTickTime = 0;

    // Register with unified clock
    runtime.clock.register(this);

    // Emit timer:started event
    runtime.handle({
      name: 'timer:started',
      timestamp: new Date(),
      data: {
        blockId: block.key.toString(),
        direction: this.direction,
        startTime: this.startTime,
      },
    });
    
    console.log(`⏱️ TimerBehavior: onPush for ${this.label}, autoStart=${this.autoStart}`);

    // Determine role based on stack depth if auto, otherwise use configured role
    let finalRole = this.role;
    if (finalRole === 'auto') {
    
        // Root is secondary by default if auto (but we passed explicit secondary for root)
        // Actually, if we pass 'secondary' for root, this logic is skipped.
        // But for other blocks, we might want auto logic.
        // The old logic was:
        // const role = stackDepth === 1 ? 'root' : block.children && block.children.length > 0 ? 'segment' : 'leaf';
        // We can map that to primary/secondary/auto if needed, but TimerStateManager handles 'auto' now.
        // However, TimerStateManager's 'auto' logic is based on direction (countdown=primary).
        // We might want to preserve the hierarchy logic here if needed.
        // But for now, let's trust TimerStateManager's auto logic or pass explicit roles.
    }

    return this.stateManager.initialize(runtime, block, Date.now(), this.role, this.autoStart);
  }

  /**
   * Called right before the owning block is popped from the stack.
   */
  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Unregister from clock
    runtime.clock.unregister(this);

    return this.stateManager.cleanup(block);
  }

  /**
   * Called by RuntimeClock on every tick.
   */
  onTick(timestamp: number, _elapsed: number): void {
    if (this._isPaused || !this._runtime) return;

    // Throttle updates to ~100ms
    if (timestamp - this.lastTickTime < this.tickIntervalMs) {
        return;
    }
    this.lastTickTime = timestamp;

    // We need the block to emit events with the block ID.
    // Since onTick doesn't provide the block, we rely on the memory reference or stored ID.
    // However, IRuntimeBehavior doesn't store the block by default.
    // We can get the block ID from the timerRef if initialized.
    const timerRef = this.stateManager.getTimerRef();
    if (!timerRef) return;
    
    const blockId = timerRef.ownerId;
    
    // Calculate elapsed time
    this.elapsedMs = timestamp - this.startTime;

    // Check for countdown completion
    if (this.direction === 'down' && this.durationMs !== undefined) {
      const remainingMs = this.durationMs - this.elapsedMs;
      
      if (remainingMs <= 0) {
        // Timer complete!
        this.elapsedMs = this.durationMs;
        
        // Stop receiving ticks
        this._runtime.clock.unregister(this);
        
        this._runtime.handle({
          name: 'timer:complete',
          timestamp: new Date(),
          data: {
            blockId: blockId,
            finalTime: this.durationMs,
          },
        });
        return;
      }
    }

    // Emit tick event
    const tickData: any = {
      blockId: blockId,
      elapsedMs: this.elapsedMs,
      displayTime: this.getDisplayTime(),
      direction: this.direction,
    };
    
    // Include remaining time for countdown timers
    if (this.direction === 'down' && this.durationMs !== undefined) {
      tickData.remainingMs = this.durationMs - this.elapsedMs;
    }
    
    this._runtime.handle({
      name: 'timer:tick',
      timestamp: new Date(),
      data: tickData,
    });
  }

  /**
   * Get current elapsed time in milliseconds.
   */
  getElapsedMs(): number {
    if (this._isPaused) {
      return this.elapsedMs;
    }

    if (this._runtime) {
      return this._runtime.clock.now - this.startTime;
    }

    return this.elapsedMs;
  }

  /**
   * Get display time rounded to 0.1s precision.
   * Converts milliseconds to seconds and rounds to nearest 0.1s.
   */
  getDisplayTime(): number {
    const seconds = this.getElapsedMs() / 1000;
    // Use the utility for consistency, though implementation is trivial
    return Math.round(seconds * 10) / 10;
  }

  /**
   * Check if timer is currently running.
   */
  isRunning(): boolean {
    const timerRef = this.stateManager.getTimerRef();
    if (timerRef) {
      return timerRef.get()?.isRunning || false;
    }
    return !this._isPaused;
  }

  /**
   * Check if timer is complete (only for countdown timers).
   */
  isComplete(): boolean {
    if (this.direction === 'down' && this.durationMs !== undefined) {
      return this.getElapsedMs() >= this.durationMs;
    }
    return false;
  }

  /**
   * Check if timer is currently paused.
   * A timer is paused if it has time spans but the last one is stopped and there's an interval running.
   */
  isPaused(): boolean {
    const timerRef = this.stateManager.getTimerRef();
    if (timerRef) {
      const state = timerRef.get();
      if (state) {
        const spans = state.spans;
        // Paused means: we have spans, the last span is closed, and memory says not running
        if (spans.length > 0 && spans[spans.length - 1].stop && !state.isRunning) {
          return true;
        }
      }
      return false;
    }
    return this._isPaused;
  }

  /**
   * Start the timer. Creates a new time span.
   */
  start(): void {
    this._isPaused = false;
    const timerRef = this.stateManager.getTimerRef();
    if (!timerRef || !this._runtime) {
      return;
    }

    const state = timerRef.get();
    if (!state) return;
    
    const spans = [...state.spans];
    
    // If already running, don't start again
    if (spans.length > 0 && !spans[spans.length - 1].stop) {
      return;
    }

    // Add new span
    spans.push({ start: Date.now(), state: 'new' });
    
    this.stateManager.updateState(this._runtime, spans, true);
  }

  /**
   * Stop the timer. Closes the current time span.
   */
  stop(): void {
    this._isPaused = true;
    const timerRef = this.stateManager.getTimerRef();
    if (!timerRef) {
      return;
    }

    const state = timerRef.get();
    if (!state) return;

    const spans = [...state.spans];
    if (spans.length > 0 && !spans[spans.length - 1].stop) {
      spans[spans.length - 1].stop = Date.now();
      
      this.stateManager.updateState(this._runtime, spans, false);
    }
  }

  /**
   * Pause the timer. Closes the current time span.
   */
  pause(): void {
    this._isPaused = true;
    const timerRef = this.stateManager.getTimerRef();
    if (!timerRef) {
      // Fallback to old behavior if memory not initialized
      if (this._runtime) {
        this.pauseTime = this._runtime.clock.now;
        this.elapsedMs = this.pauseTime - this.startTime;
      }
      return;
    }

    const state = timerRef.get();
    if (!state) return;

    const spans = [...state.spans];
    
    // If not running, nothing to pause
    if (spans.length === 0 || spans[spans.length - 1].stop) {
      return;
    }

    // Close the current span
    spans[spans.length - 1].stop = Date.now();
    
    this.stateManager.updateState(this._runtime, spans, false);
  }

  /**
   * Resume the timer. Creates a new time span.
   */
  resume(): void {
    console.log(`⏱️ TimerBehavior: Resume called for ${this.label}`);
    this._isPaused = false;
    const timerRef = this.stateManager.getTimerRef();
    if (!timerRef) {
      console.warn(`⚠️ TimerBehavior: No timerRef for ${this.label}`);
      // Fallback to old behavior if memory not initialized
      if (this._runtime) {
        const now = this._runtime.clock.now;
        this.startTime = now - this.elapsedMs;
      }
      return;
    }

    const state = timerRef.get();
    if (!state) return;

    const spans = [...state.spans];
    
    // If already running, don't resume
    if (spans.length > 0 && !spans[spans.length - 1].stop) {
      console.log(`ℹ️ TimerBehavior: Already running`);
      return;
    }

    // Add new span
    console.log(`✅ TimerBehavior: Adding new span to ${this.label}`);
    spans.push({ start: Date.now(), state: 'new' });
    
    this.stateManager.updateState(this._runtime, spans, true);
  }

  /**
   * Cleanup: clear interval and remove event listeners.
   * Must complete in <50ms per performance contract.
   */
  onDispose(runtime: IScriptRuntime, _block: IRuntimeBlock): void {
    this.stop();
    runtime.clock.unregister(this);
  }

  /**
   * Get time spans for this timer from memory.
   */
  getTimeSpans(): TimerSpan[] {
    const timerRef = this.stateManager.getTimerRef();
    if (timerRef) {
      return timerRef.get()?.spans || [];
    }
    
    // Fallback for tests that don't use memory
    const elapsedMs = this.getElapsedMs();
    const now = Date.now();
    return [{
      start: now - elapsedMs,
      stop: this.isRunning() ? undefined : now,
      state: 'new'
    }];
  }

  /**
   * Get total elapsed time in milliseconds by summing all time spans.
   */
  getTotalElapsed(): number {
    const spans = this.getTimeSpans();
    
    if (spans.length === 0) {
      return 0;
    }

    // Use calculateDuration utility
    // Note: TimerSpan uses numbers for timestamps (from MemoryModels) or fallback logic in getTimeSpans()
    return calculateDuration(
        spans.map(s => ({ start: s.start, stop: s.stop })),
        Date.now()
    );
  }
  /**
   * Reset the timer. Clears all time spans and stops the timer.
   */
  reset(): void {
    if (this._runtime) {
        this._runtime.clock.unregister(this);
    }
    
    this._isPaused = false;
    this.elapsedMs = 0;
    this.startTime = 0;

    this.stateManager.resetState();
  }

  /**
   * Restart the timer. Resets state and starts immediately.
   * Used for interval timers (EMOM).
   */
  restart(): void {
    // 1. Reset internal state
    this._isPaused = false;
    this.elapsedMs = 0;
    
    if (this._runtime) {
        this.startTime = this._runtime.clock.now;
        // Ensure registered
        this._runtime.clock.register(this);
    }

    // 2. Reset memory state and start new span
    this.stateManager.updateState(this._runtime, [{ start: Date.now(), state: 'new' }], true);
  }
}
