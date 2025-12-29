import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions, IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { TimerBehavior } from './TimerBehavior';
import { SetRoundsDisplayAction } from '../actions/display/WorkoutStateActions';
import { TypedMemoryReference } from '../contracts/IMemoryReference';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../models/RuntimeSpan';
import { TimeSpan } from '../models/TimeSpan';
import { IEvent } from '../contracts/events/IEvent';
import { CompileAndPushBlockAction } from '../actions/stack/CompileAndPushBlockAction';
import { UpdateDisplayStateAction } from '../actions/display/UpdateDisplayStateAction';

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

  /** Callback executed when a new round starts (before child compilation) */
  onRoundStart?: (roundIndex: number) => void;
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
  private isWaitingForInterval: boolean = false;
  private readonly config: LoopConfig;
  private lapTimerRefs: TypedMemoryReference<TimeSpan[]>[] = []; // Track lap timer refs for cleanup

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
  onPush(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    // Delegate to onNext to compile and push first child
    return this.onNext(block, options);
  }

  /**
   * Called when advancing to the next execution step.
   * Returns PushBlockAction for next child or empty array if complete.
   */
  onNext(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const now = options?.now ?? new Date();

    // Handle INTERVAL waiting logic
    if (this.config.loopType === LoopType.INTERVAL) {
      if (this.isWaitingForInterval) {
        return [];
      }

      if (this.index >= 0) {
        const timerBehavior = block.getBehavior(TimerBehavior);
        // timerBehavior.isComplete uses local timestamp check now
        if (timerBehavior && timerBehavior.isRunning() && !timerBehavior.isComplete(now)) {
          this.isWaitingForInterval = true;
          return [];
        }
      }
    }

    // Proceed to advance
    return this.advance(block, now);
  }

  /**
   * Advances the loop state and returns actions to execute next step.
   */
  private advance(block: IRuntimeBlock, now: Date): IRuntimeAction[] {
    // Increment index
    this.index++;

    // Get current state after increment
    const state = this.getState();

    // Check completion AFTER incrementing
    if (this.isComplete(block, now)) {
      return [];
    }

    const actions: IRuntimeAction[] = [];

    // Update round display info
    const currentRound = state.rounds + 1;
    const totalRounds = this.config.totalRounds;

    if (totalRounds) {
      actions.push(new SetRoundsDisplayAction(currentRound, totalRounds));
    }

    // Check if this is a round boundary (position wrapped to 0)
    if (state.position === 0) {
      const roundActions = this.emitRoundChanged(state.rounds, block, now);
      actions.push(...roundActions);

      if (this.config.onRoundStart) {
        this.config.onRoundStart(state.rounds);
      }
    }

    // Get the child group IDs at current position
    const childGroupIds = this.config.childGroups[state.position];
    if (!childGroupIds || childGroupIds.length === 0) {
      return actions;
    }

    // Use CompileAndPushBlockAction to JIT compile and push
    actions.push(new CompileAndPushBlockAction(childGroupIds, { startTime: now }));

    return actions;
  }

  /**
   * Handles events dispatched to the block.
   */
  onEvent(event: IEvent, block: IRuntimeBlock): IRuntimeAction[] {
    const now = event.timestamp ?? new Date();

    // Handle interval completion
    if (event.name === 'timer:complete' && this.config.loopType === LoopType.INTERVAL) {
      const data = event.data as { blockId?: string } | undefined;
      // safe access
      if (data?.blockId === block.key.toString()) {
        if (this.isWaitingForInterval) {
          this.isWaitingForInterval = false;
          return this.advance(block, now);
        } else {
          // See previous comment about "Catch up" behavior logic being tricky here
          // without runtime access to check stack.
        }
      }
    }
    return [];
  }

  /**
   * Checks if the loop has completed.
   */
  isComplete(block: IRuntimeBlock, now: Date): boolean {
    const state = this.getState();

    switch (this.config.loopType) {
      case LoopType.FIXED:
      case LoopType.REP_SCHEME:
        // Complete when we've finished all rounds
        return state.rounds >= (this.config.totalRounds || 0);

      case LoopType.TIME_BOUND:
        // Complete when timer expires
        return this.isTimerExpired(block, now);

      case LoopType.INTERVAL:
        // Complete after specified number of intervals
        return state.rounds >= (this.config.totalRounds || 0);

      default:
        return false;
    }
  }

  /**
   * Gets reps for the current round (for rep scheme loop type).
   */
  getRepsForCurrentRound(): number | undefined {
    if (this.config.loopType !== LoopType.REP_SCHEME || !this.config.repScheme) {
      return undefined;
    }

    const state = this.getState();
    const schemeIndex = state.rounds % this.config.repScheme.length;
    return this.config.repScheme[schemeIndex];
  }

  /**
   * Checks if the timer has expired (for time-bound loops).
   */
  private isTimerExpired(block: IRuntimeBlock, now: Date): boolean {
    const timerBehavior = block.getBehavior(TimerBehavior);
    if (timerBehavior) {
      return timerBehavior.isComplete(now);
    }
    return false;
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
  onPop(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const now = options?.completedAt ?? new Date();

    // Close the current round span if it exists
    const state = this.getState();
    const currentRound = state.rounds + 1;
    const roundOwnerId = `${block.key.toString()}-round-${currentRound}`;

    const spans = block.context.getAll<RuntimeSpan>(RUNTIME_SPAN_TYPE);
    const spanRef = spans.find(r => r.ownerId === roundOwnerId);

    if (spanRef) {
      const span = spanRef.get();
      if (span && span.isActive()) {
        const lastTimer = span.spans[span.spans.length - 1];
        if (lastTimer) {
          lastTimer.ended = now.getTime();
        }
        block.context.set(spanRef, span);
      }
    }

    return [];
  }

  /**
   * Disposes of resources.
   * Safe to call multiple times.
   */
  dispose(): void {
    // Clear lap timer refs
    this.lapTimerRefs = [];
  }

  /**
   * Emits rounds:changed event and manages round execution records.
   */
  private emitRoundChanged(rounds: number, block: IRuntimeBlock, now: Date): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    const blockId = block.key.toString();
    const prevRound = rounds; // The round that just finished (0-indexed)
    const nextRound = rounds + 1; // The new round (1-indexed)

    // 1. Close previous round span
    if (prevRound > 0) {
      const prevRoundOwnerId = `${blockId}-round-${prevRound}`;
      const spans = block.context.getAll<RuntimeSpan>(RUNTIME_SPAN_TYPE);
      const prevRef = spans.find(r => r.ownerId === prevRoundOwnerId);

      if (prevRef) {
        const span = prevRef.get();
        if (span && span.isActive()) {
          const lastTimer = span.spans[span.spans.length - 1];
          if (lastTimer) {
            lastTimer.ended = now.getTime();
          }
          block.context.set(prevRef, span);
        }
      }
    }

    // 2. Create new round span
    // Only if we are not complete
    if (rounds < (this.config.totalRounds || Infinity)) {
      const newRoundOwnerId = `${blockId}-round-${nextRound}`;
      const type = this.config.loopType === LoopType.INTERVAL ? 'interval' : 'rounds';
      const label = this.config.loopType === LoopType.INTERVAL
        ? `Interval ${nextRound}`
        : `Round ${nextRound}`;

      const startTime = now.getTime();

      // Create fragments with round info
      const fragments: any[] = [{
        type: type,
        fragmentType: 'rounds',
        value: nextRound,
        image: label
      }];

      if (this.config.repScheme) {
        const schemeIndex = rounds % this.config.repScheme.length;
        const targetReps = this.config.repScheme[schemeIndex];
        fragments.push({
          type: 'reps',
          fragmentType: 'reps',
          value: targetReps,
          image: `${targetReps}`
        });
      }

      const span = new RuntimeSpan(
        newRoundOwnerId,
        [...block.sourceIds],
        [new TimeSpan(startTime)],
        [fragments],
        undefined,
        { tags: [type], context: { round: nextRound, totalRounds: this.config.totalRounds }, logs: [] },
        blockId
      );

      // Allocate in block context
      block.context.allocate(RUNTIME_SPAN_TYPE, span, 'public');

      // Create lap timer for this round
      const lapTimerMemoryId = `timer:lap:${block.key}:${rounds}`;
      const lapTimerRef = block.context.allocate<TimeSpan[]>(
        lapTimerMemoryId,
        [new TimeSpan(startTime)],
        'public'
      );

      // Track lap timer ref for cleanup
      this.lapTimerRefs.push(lapTimerRef);

      // Update display state
      actions.push(new UpdateDisplayStateAction({
        currentLapTimerMemoryId: lapTimerMemoryId
      }));
    }

    // For INTERVAL loops (EMOM), restart the timer for the new round
    if (this.config.loopType === LoopType.INTERVAL) {
      const timerBehavior = block.getBehavior(TimerBehavior);
      if (timerBehavior) {
        timerBehavior.restart(now);
      }
    }

    return actions;
  }
}
