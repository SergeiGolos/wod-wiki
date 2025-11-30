import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeAction } from '../IRuntimeAction';
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { TimerBehavior, TIMER_MEMORY_TYPES } from '../behaviors/TimerBehavior';
import { CompletionBehavior } from '../behaviors/CompletionBehavior';
import { LoopCoordinatorBehavior, LoopType } from '../behaviors/LoopCoordinatorBehavior';
import { HistoryBehavior } from '../behaviors/HistoryBehavior';
import { PushTimerDisplayAction, PopTimerDisplayAction } from '../actions/TimerDisplayActions';
import { PushCardDisplayAction, PopCardDisplayAction } from '../actions/CardDisplayActions';

/**
 * TimerBlock Configuration
 */
export interface TimerBlockConfig {
  direction: 'up' | 'down';
  durationMs?: number;
  /** Optional child statement IDs grouped by execution. Each number[] is compiled together. */
  children?: number[][];
}

/**
 * TimerBlock manages time-based workout execution.
 * 
 * Features:
 * - Count-up timers (For Time workouts)
 * - Countdown timers (AMRAP workouts)
 * - Sub-second internal precision with 0.1s display
 * - Pause/resume within session
 * - Wraps child blocks (RoundsBlock or EffortBlock)
 * - Completion: countdown reaches zero OR children complete
 * - Records exact completion timestamp
 * 
 * API Contract: contracts/runtime-blocks-api.md
 */
export class TimerBlock extends RuntimeBlock {
  private timerBehavior: TimerBehavior;

  constructor(
    runtime: IScriptRuntime,
    sourceIds: number[],
    private readonly config: TimerBlockConfig
  ) {
    // Validate configuration
    if (config.direction !== 'up' && config.direction !== 'down') {
      throw new TypeError(`Invalid timer direction: ${config.direction}. Must be 'up' or 'down'.`);
    }

    if (config.direction === 'down' && config.durationMs === undefined) {
      throw new TypeError('Countdown timers (direction="down") require durationMs');
    }

    if (config.durationMs !== undefined && config.durationMs <= 0) {
      throw new RangeError(`durationMs must be > 0, got: ${config.durationMs}`);
    }

    // Create timer behavior
    const timerBehavior = new TimerBehavior(config.direction, config.durationMs);

    // Create behaviors array
    const behaviors: IRuntimeBehavior[] = [
        timerBehavior,
        new HistoryBehavior("Timer")
    ];

    // If TimerBlock has children, add LoopCoordinatorBehavior for child management
    let loopCoordinator: LoopCoordinatorBehavior | undefined;
    if (config.children && config.children.length > 0) {
      loopCoordinator = new LoopCoordinatorBehavior({
        childGroups: config.children, // Already grouped number[][] from strategy
        loopType: LoopType.FIXED,
        totalRounds: 1, // Timer pushes child once
      });
      behaviors.push(loopCoordinator);
    }

    // Create completion behavior
    // For count-up: complete when children finish
    // For countdown: complete when timer reaches zero OR children finish
    const completionBehavior = new CompletionBehavior(
      (rt, _block) => {
        // Check if timer completed (for countdown)
        const isTimerComplete = config.direction === 'down' && 
          config.durationMs !== undefined &&
          timerBehavior.getElapsedMs() >= config.durationMs;

        // Check if children completed (if any)
        const childrenComplete = !loopCoordinator || loopCoordinator.isComplete(rt);

        return isTimerComplete || childrenComplete;
      },
      ['timer:complete', 'children:complete']
    );
    
    behaviors.push(completionBehavior);

    // Generate label based on timer configuration
    const label = config.direction === 'down' && config.durationMs
      ? `${Math.floor(config.durationMs / 60000)}:${String(Math.floor((config.durationMs % 60000) / 1000)).padStart(2, '0')}`
      : 'For Time';

    // Initialize RuntimeBlock with behaviors
    super(
      runtime,
      sourceIds,
      behaviors,
      "Timer",  // blockType
      undefined, // blockKey
      undefined, // blockTypeParam
      label      // label
    );

    // Store reference to timer behavior for state access
    this.timerBehavior = timerBehavior;
  }

  /**
   * Get current elapsed time in milliseconds.
   */
  getElapsedMs(): number {
    return this.timerBehavior.getElapsedMs();
  }

  /**
   * Get display time rounded to 0.1s precision.
   */
  getDisplayTime(): number {
    return this.timerBehavior.getDisplayTime();
  }

  /**
   * Get remaining time for countdown timers.
   * Returns undefined for count-up timers.
   */
  getRemainingMs(): number | undefined {
    if (this.config.direction === 'down' && this.config.durationMs !== undefined) {
      const remaining = this.config.durationMs - this.timerBehavior.getElapsedMs();
      return Math.max(0, remaining);
    }
    return undefined;
  }

  /**
   * Check if timer is currently running.
   */
  isRunning(): boolean {
    return this.timerBehavior.isRunning();
  }

  /**
   * Check if timer is currently paused.
   */
  isPaused(): boolean {
    return this.timerBehavior.isPaused();
  }

  /**
   * Pause the timer. Preserves elapsed time.
   */
  pause(): void {
    this.timerBehavior.pause();
  }

  /**
   * Resume the timer from current elapsed time.
   */
  resume(): void {
    this.timerBehavior.resume();
  }

  /**
   * Get timer direction.
   */
  getDirection(): 'up' | 'down' {
    return this.config.direction;
  }

  /**
   * Get configured duration for countdown timers.
   * Returns undefined for count-up timers.
   */
  getDurationMs(): number | undefined {
    return this.config.durationMs;
  }

  /**
   * Mount the timer block and push display entries.
   */
  mount(runtime: IScriptRuntime): IRuntimeAction[] {
    // Get base actions from parent
    const actions = super.mount(runtime);

    // Find the timer memory reference (allocated by TimerBehavior.onPush)
    // We search by type and ownerId since the ref is created after super.mount
    const timerMemoryId = this.findTimerMemoryId(runtime);

    // Push timer display entry
    actions.push(new PushTimerDisplayAction({
      id: `timer-display-${this.key.toString()}`,
      ownerId: this.key.toString(),
      timerMemoryId: timerMemoryId || `timer-${this.key.toString()}`, // fallback ID
      label: this.label,
      format: this.config.direction === 'down' ? 'countdown' : 'countup',
      durationMs: this.config.durationMs,
      priority: 10, // Lower = more important, timers show above cards
    }));

    // Push activity card for timer context
    actions.push(new PushCardDisplayAction({
      id: `card-${this.key.toString()}`,
      ownerId: this.key.toString(),
      type: 'active-block',
      title: this.config.direction === 'down' ? 'AMRAP' : 'For Time',
      subtitle: this.label,
      metrics: this.config.durationMs ? [{
        type: 'timer',
        value: `${Math.floor(this.config.durationMs / 60000)}:${String(Math.floor((this.config.durationMs % 60000) / 1000)).padStart(2, '0')}`,
        isActive: true,
      }] : [],
      priority: 20,
    }));

    return actions;
  }

  /**
   * Unmount the timer block and pop display entries.
   */
  unmount(runtime: IScriptRuntime): IRuntimeAction[] {
    const actions = super.unmount(runtime);

    // Pop timer and card displays
    actions.push(new PopTimerDisplayAction(`timer-display-${this.key.toString()}`));
    actions.push(new PopCardDisplayAction(`card-${this.key.toString()}`));

    return actions;
  }

  /**
   * Find the timer memory reference ID by searching runtime memory.
   * The TimerBehavior allocates memory with type TIMER_TIME_SPANS and ownerId = block key.
   */
  private findTimerMemoryId(runtime: IScriptRuntime): string | undefined {
    const refs = runtime.memory.search({
      id: null,
      ownerId: this.key.toString(),
      type: TIMER_MEMORY_TYPES.TIME_SPANS,
      visibility: null,
    });
    return refs.length > 0 ? refs[0].id : undefined;
  }
}
