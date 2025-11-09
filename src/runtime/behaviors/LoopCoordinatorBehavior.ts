/**
 * LoopCoordinatorBehavior
 * 
 * Unified behavior for managing loop execution in workout blocks.
 * Replaces the fragmented RoundsBehavior + ChildAdvancementBehavior + LazyCompilationBehavior model.
 * 
 * Features:
 * - Tracks loop state: index (total advancements), position (child index), rounds (completed rounds)
 * - Supports multiple loop types: fixed rounds, rep schemes, time-bound (AMRAP), intervals (EMOM)
 * - Handles child group compilation with context passing
 * - Automatic initial push on mount
 * - Round boundary detection and event emission
 * 
 * Loop State Model:
 * - index: Increments on every next() call (0, 1, 2, 3...)
 * - position: index % childGroups.length (which child group to execute)
 * - rounds: Math.floor(index / childGroups.length) (completed rounds, 0-indexed)
 * 
 * Example (Fran: (21-15-9) Thrusters, Pullups):
 * - mount: index=-1 → push Thrusters (21 reps)
 * - next1: index=0, pos=0, round=0 → push Pullups (21 reps)
 * - next2: index=1, pos=1, round=0 → push Thrusters (15 reps) [round wrap]
 * - next3: index=2, pos=0, round=1 → push Pullups (15 reps)
 * - next4: index=3, pos=1, round=1 → push Thrusters (9 reps) [round wrap]
 * - next5: index=4, pos=0, round=2 → push Pullups (9 reps)
 * - next6: index=5, pos=1, round=2 → complete (rounds=2, totalRounds=3)
 */

import { CodeStatement } from '../../CodeStatement';
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { PushBlockAction } from '../PushBlockAction';

/**
 * Loop type determines completion logic.
 */
export enum LoopType {
  /** Fixed number of rounds with same reps each round */
  FIXED = 'fixed',
  
  /** Variable reps per round (e.g., 21-15-9) */
  REP_SCHEME = 'repScheme',
  
  /** Loop until timer expires (AMRAP) */
  TIME_BOUND = 'timeBound',
  
  /** Fixed intervals with timer resets (EMOM) */
  INTERVAL = 'interval',
}

/**
 * Configuration for LoopCoordinatorBehavior.
 */
export interface LoopConfig {
  /** Array of child statement ID groups (separated by rounds/intervals).
   * Each number[] represents statement IDs to JIT-compile together.
   * Example: [[1, 2], [3]] = "compile statements 1+2 together, then 3"
   */
  childGroups: number[][];
  
  /** Type of loop execution */
  loopType: LoopType;
  
  /** Total rounds to complete (for fixed and repScheme types) */
  totalRounds?: number;
  
  /** Variable reps per round (for repScheme type) */
  repScheme?: number[];
  
  /** Interval duration in milliseconds (for interval type) */
  intervalDurationMs?: number;
}

/**
 * Current loop execution state.
 */
export interface LoopState {
  /** Total next() calls (increments every advancement) */
  index: number;
  
  /** Current child group position: index % childGroups.length */
  position: number;
  
  /** Completed rounds: Math.floor(index / childGroups.length) */
  rounds: number;
}

/**
 * LoopCoordinatorBehavior manages all aspects of loop execution for workout blocks.
 */
export class LoopCoordinatorBehavior implements IRuntimeBehavior {
  private index: number = -1; // Pre-first-advance state (onPush will increment to 0)
  private readonly config: LoopConfig;

  /**
   * Creates a new LoopCoordinatorBehavior.
   * 
   * @param config Loop configuration
   * @throws {RangeError} If configuration is invalid
   */
  constructor(config: LoopConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * Validates loop configuration.
   */
  private validateConfig(config: LoopConfig): void {
    if (config.childGroups.length === 0) {
      throw new RangeError('childGroups must not be empty');
    }

    if (config.loopType === LoopType.FIXED || config.loopType === LoopType.REP_SCHEME) {
      if (config.totalRounds === undefined || config.totalRounds < 1) {
        throw new RangeError(
          `totalRounds must be >= 1 for ${config.loopType} loop type, got: ${config.totalRounds}`
        );
      }
    }

    if (config.loopType === LoopType.REP_SCHEME) {
      if (!config.repScheme || config.repScheme.length === 0) {
        throw new RangeError('repScheme must be provided for repScheme loop type');
      }

      if (config.repScheme.length !== config.totalRounds) {
        throw new RangeError(
          `repScheme length (${config.repScheme.length}) must match totalRounds (${config.totalRounds})`
        );
      }

      // Validate each rep value
      for (let i = 0; i < config.repScheme.length; i++) {
        if (config.repScheme[i] <= 0) {
          throw new RangeError(`repScheme[${i}] must be > 0, got: ${config.repScheme[i]}`);
        }
      }
    }

    if (config.loopType === LoopType.INTERVAL) {
      if (config.intervalDurationMs === undefined || config.intervalDurationMs <= 0) {
        throw new RangeError(
          `intervalDurationMs must be > 0 for interval loop type, got: ${config.intervalDurationMs}`
        );
      }
    }
  }

  /**
   * Gets the current loop state.
   */
  getState(): LoopState {
    const position = this.index % this.config.childGroups.length;
    const rounds = Math.floor(this.index / this.config.childGroups.length);

    return {
      index: this.index,
      position,
      rounds,
    };
  }

  /**
   * Called when the block is pushed onto the stack.
   * Automatically compiles and pushes the first child group.
   */
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Delegate to onNext to compile and push first child
    return this.onNext(runtime, block);
  }

  /**
   * Called when advancing to the next execution step.
   * Returns PushBlockAction for next child or empty array if complete.
   */
  onNext(runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeAction[] {
    // Increment index first
    this.index++;

    // Get current state after increment
    const state = this.getState();

    // Check completion AFTER incrementing
    if (this.isComplete(runtime)) {
      return [];
    }

    // Check if this is a round boundary (position wrapped to 0)
    // Note: Don't emit on very first push (index=0, rounds=0)
    if (state.position === 0 && state.rounds > 0) {
      this.emitRoundChanged(runtime, state.rounds);
    }

    // Get the child group IDs at current position
    const childGroupIds = this.config.childGroups[state.position];
    if (!childGroupIds || childGroupIds.length === 0) {
      console.warn(`LoopCoordinatorBehavior: No children at position ${state.position}`);
      return [];
    }

    // Resolve child IDs to statements (lazy JIT resolution)
    const childStatements = runtime.script.getIds(childGroupIds);
    if (childStatements.length === 0) {
      console.warn(`LoopCoordinatorBehavior: Failed to resolve child IDs at position ${state.position}`);
      return [];
    }

    // Compile the child group using JIT compiler
    // Children will search memory for public metrics from parent blocks
    try {
      const compiledBlock = runtime.jit.compile(childStatements, runtime);
      
      if (!compiledBlock) {
        console.warn(`LoopCoordinatorBehavior: JIT compiler returned undefined for position ${state.position}`);
        return [];
      }

      // Return PushBlockAction to push the compiled child onto the stack
      return [new PushBlockAction(compiledBlock)];
    } catch (error) {
      console.error(`LoopCoordinatorBehavior: Compilation failed for position ${state.position}:`, error);
      return [];
    }
  }

  /**
   * Checks if the loop has completed.
   */
  isComplete(runtime: IScriptRuntime): boolean {
    const state = this.getState();

    switch (this.config.loopType) {
      case LoopType.FIXED:
      case LoopType.REP_SCHEME:
        // Complete when we've finished all rounds
        return state.rounds >= (this.config.totalRounds || 0);

      case LoopType.TIME_BOUND:
        // Complete when timer expires
        return this.isTimerExpired(runtime);

      case LoopType.INTERVAL:
        // Complete after specified number of intervals
        return state.rounds >= (this.config.totalRounds || 0);

      default:
        return false;
    }
  }

  /**
   * Gets reps for the current round (for rep scheme loop type).
   * @returns Reps for current round or undefined if not applicable
   */
  getRepsForCurrentRound(): number | undefined {
    if (this.config.loopType !== LoopType.REP_SCHEME || !this.config.repScheme) {
      return undefined;
    }

    const state = this.getState();
    return this.config.repScheme[state.rounds];
  }

  /**
   * Checks if the timer has expired (for time-bound loops).
   */
  private isTimerExpired(runtime: IScriptRuntime): boolean {
    // TODO: Implement timer checking
    // For now, return false
    return false;
  }

  /**
   * Emits rounds:changed event.
   */
  private emitRoundChanged(runtime: IScriptRuntime, rounds: number): void {
    // TODO: Implement event emission
    // runtime.emit('rounds:changed', {
    //   round: rounds + 1, // 1-indexed for display
    //   totalRounds: this.config.totalRounds || 0,
    // });
  }

  /**
   * Gets the number of completed rounds (for AMRAP tracking).
   */
  getCompletedRounds(): number {
    const state = this.getState();
    return state.rounds;
  }



  /**
   * Called when the block is popped from the stack.
   * Cleanup any state if needed.
   */
  onPop(_runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeAction[] {
    // No cleanup needed for stateless behavior
    return [];
  }

  /**
   * Disposes of resources.
   * Safe to call multiple times.
   */
  dispose(): void {
    // No resources to dispose (no timers, no event listeners)
  }
}
