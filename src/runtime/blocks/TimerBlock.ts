import { BlockKey } from '../../core/models/BlockKey';
import { CodeStatement } from '../../core/models/CodeStatement';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeAction } from '../IRuntimeAction';
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { TimerBehavior } from '../behaviors/TimerBehavior';
import { CompletionBehavior } from '../behaviors/CompletionBehavior';
import { LoopCoordinatorBehavior, LoopType } from '../behaviors/LoopCoordinatorBehavior';
import { HistoryBehavior } from '../behaviors/HistoryBehavior';

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

    // Initialize RuntimeBlock with behaviors
    super(
      runtime,
      sourceIds,
      behaviors,
      "Timer"  // blockType
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
}
