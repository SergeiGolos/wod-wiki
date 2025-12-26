import { CodeStatement } from '../../core/models/CodeStatement';
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { BlockLifecycleOptions, IRuntimeBlock } from '../IRuntimeBlock';
import { PushBlockAction } from '../PushBlockAction';
import { TimerBehavior, TimeSpan } from './TimerBehavior';
import { SetRoundsDisplayAction } from '../actions/WorkoutStateActions';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { TypedMemoryReference } from '../IMemoryReference';
import { IDisplayStackState } from '../../clock/types/DisplayTypes';
import { TrackedSpan, createEmptyMetrics, EXECUTION_SPAN_TYPE } from '../models/ExecutionSpan';
import { IEvent } from '../IEvent';

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
  onRoundStart?: (runtime: IScriptRuntime, roundIndex: number) => void;
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

      // Rep scheme cycles via modulo - no need to match totalRounds
      // E.g., 21-15-9 with 5 rounds: 21, 15, 9, 21, 15

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
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    // Delegate to onNext to compile and push first child
    // Pass the block explicitly
    return this.onNext(runtime, block, options);
  }

  /**
   * Called when advancing to the next execution step.
   * Returns PushBlockAction for next child or empty array if complete.
   */
  onNext(runtime: IScriptRuntime, block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    // Handle INTERVAL waiting logic
    if (this.config.loopType === LoopType.INTERVAL) {
      // If we are waiting, do nothing (waiting for timer:complete)
      if (this.isWaitingForInterval) {
        return [];
      }

      // If we have started at least one round (index >= 0) and the timer is running,
      // it means we finished the work early and need to wait.
      // EXCEPTION: If index is -1, we are just starting, so proceed immediately.
      if (this.index >= 0) {
        const timerBehavior = block.getBehavior(TimerBehavior);
        if (timerBehavior && timerBehavior.isRunning() && !timerBehavior.isComplete()) {
          console.log(`LoopCoordinator: Work complete, waiting for interval timer...`);
          this.isWaitingForInterval = true;
          return [];
        }
      }
    }

    // Proceed to advance
    return this.advance(runtime, block, options);
  }

  /**
   * Advances the loop state and returns actions to execute next step.
   */
  private advance(runtime: IScriptRuntime, block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    // Increment index
    this.index++;

    // Get current state after increment
    const state = this.getState();

    // Check completion AFTER incrementing
    if (this.isComplete(runtime, block)) {
      return [];
    }

    const actions: IRuntimeAction[] = [];

    // Update round display info
    // We update this on every step to ensure it's correct, but we could optimize to only update on change
    // Current round is 1-indexed for display
    const currentRound = state.rounds + 1;
    const totalRounds = this.config.totalRounds;

    if (totalRounds) {
      actions.push(new SetRoundsDisplayAction(currentRound, totalRounds));
    }

    // Check if this is a round boundary (position wrapped to 0)
    // Emit for every round start, including the first one (rounds=0)
    if (state.position === 0) {
      this.emitRoundChanged(runtime, state.rounds, block);

      // Execute custom round start logic (e.g., updating inherited metrics)
      if (this.config.onRoundStart) {
        this.config.onRoundStart(runtime, state.rounds);
      }
    }

    // Get the child group IDs at current position
    const childGroupIds = this.config.childGroups[state.position];
    if (!childGroupIds || childGroupIds.length === 0) {
      console.warn(`LoopCoordinatorBehavior: No children at position ${state.position}`);
      return actions;
    }

    // Resolve child IDs to statements (lazy JIT resolution)
    const childStatements = runtime.script.getIds(childGroupIds);
    if (childStatements.length === 0) {
      console.warn(`LoopCoordinatorBehavior: Failed to resolve child IDs at position ${state.position}`);
      return actions;
    }

    // Compile the child group using JIT compiler
    // Children will search memory for public metrics from parent blocks
    try {
      const compiledBlock = runtime.jit.compile(childStatements, runtime);

      if (!compiledBlock) {
        console.warn(`LoopCoordinatorBehavior: JIT compiler returned undefined for position ${state.position}`);
        return actions;
      }

      const startTime = options?.completedAt ?? block.executionTiming?.completedAt ?? runtime.clock.now;

      // Return PushBlockAction to push the compiled child onto the stack
      actions.push(new PushBlockAction(compiledBlock, { startTime }));
      return actions;
    } catch (error) {
      console.error(`LoopCoordinatorBehavior: Compilation failed for position ${state.position}:`, error);
      return actions;
    }
  }

  /**
   * Handles events dispatched to the block.
   */
  onEvent(event: IEvent, runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Handle interval completion
    if (event.name === 'timer:complete' && this.config.loopType === LoopType.INTERVAL) {
      // Verify the event comes from OUR block
      if (event.data?.blockId === block.key.toString()) {
        if (this.isWaitingForInterval) {
          console.log(`LoopCoordinator: Interval timer complete, advancing to next round.`);
          this.isWaitingForInterval = false;
          return this.advance(runtime, block);
        } else {
          // If we receive timer:complete but we weren't waiting, it usually means
          // we are still working (AMRAP within Interval? Or just slow).
          // In classic EMOM: "Every Minute On the Minute".
          // If work takes > 1 min, you fail the interval or start next one immediately.
          // We should probably just advance immediately if we are not complete.
          // But currently, if child is running, we can't just "advance" because the child is on top of stack.
          // This event handler runs on the PARENT block.
          // If stack.current is child, parent gets event?
          // RuntimeBlock.registerEventDispatcher only dispatches if `runtime.stack.current === this`.
          // So we only get this event if we are the current block (meaning children are done/popped).

          // Wait, if children are running, `runtime.stack.current` is the child.
          // So `onEvent` will NOT be called on parent.
          // So we only catch `timer:complete` if we are waiting (children popped).

          // But what if the timer completes WHILE child is running?
          // `TimerBehavior` emits `timer:complete`.
          // `RuntimeBlock` (parent) registers dispatcher.
          // Dispatcher checks `runtime.stack.current === this`.
          // If child is running, parent is NOT current. So parent ignores event.

          // This means if you are slow (work > interval), the parent never sees `timer:complete`.
          // When child finally finishes, `onNext` is called.
          // `onNext` sees timer is complete (or stopped).
          // If stopped, `isRunning()` is false.
          // Then we proceed to `advance()`.
          // This seems correct for "Catch up" behavior (start next round immediately).
        }
      }
    }
    return [];
  }

  /**
   * Checks if the loop has completed.
   */
  isComplete(runtime: IScriptRuntime, block?: IRuntimeBlock): boolean {
    const state = this.getState();

    switch (this.config.loopType) {
      case LoopType.FIXED:
      case LoopType.REP_SCHEME:
        // Complete when we've finished all rounds
        return state.rounds >= (this.config.totalRounds || 0);

      case LoopType.TIME_BOUND:
        // Complete when timer expires
        return this.isTimerExpired(runtime, block);

      case LoopType.INTERVAL:
        // Complete after specified number of intervals
        return state.rounds >= (this.config.totalRounds || 0);

      default:
        return false;
    }
  }

  /**
   * Gets reps for the current round (for rep scheme loop type).
   * Uses modulo to cycle through rep scheme values.
   * @returns Reps for current round or undefined if not applicable
   */
  getRepsForCurrentRound(): number | undefined {
    if (this.config.loopType !== LoopType.REP_SCHEME || !this.config.repScheme) {
      return undefined;
    }

    const state = this.getState();
    // Use modulo to cycle: round 0 → [0], round 1 → [1], round 2 → [2], round 3 → [0], etc.
    const schemeIndex = state.rounds % this.config.repScheme.length;
    return this.config.repScheme[schemeIndex];
  }

  /**
   * Checks if the timer has expired (for time-bound loops).
   */
  private isTimerExpired(_runtime: IScriptRuntime, block?: IRuntimeBlock): boolean {
    if (!block) return false;

    // Find TimerBehavior on the block
    const timerBehavior = block.getBehavior(TimerBehavior);
    if (timerBehavior) {
      return timerBehavior.isComplete();
    }

    return false;
  }

  /**
   * Emits rounds:changed event.
   */


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
  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Close the current round span if it exists
    const state = this.getState();
    const currentRound = state.rounds + 1;
    const roundOwnerId = `${block.key.toString()}-round-${currentRound}`;

    const refs = runtime.memory.search({
      type: EXECUTION_SPAN_TYPE,
      id: null,
      ownerId: roundOwnerId,
      visibility: null
    });

    if (refs.length > 0) {
      const span = runtime.memory.get(refs[0] as any) as TrackedSpan;
      if (span && span.status === 'active') {
        const updatedSpan: TrackedSpan = {
          ...span,
          endTime: Date.now(),
          status: 'completed'
        };
        runtime.memory.set(refs[0] as any, updatedSpan);
      }
    }

    return [];
  }

  /**
   * Disposes of resources.
   * Safe to call multiple times.
   */
  dispose(): void {
    // Clear lap timer refs (actual memory release happens via RuntimeMemory)
    this.lapTimerRefs = [];
  }

  /**
   * Emits rounds:changed event and manages round execution records.
   */
  private emitRoundChanged(runtime: IScriptRuntime, rounds: number, block: IRuntimeBlock): void {
    const blockId = block.key.toString();
    const prevRound = rounds; // The round that just finished (0-indexed)
    const nextRound = rounds + 1; // The new round (1-indexed)

    // 1. Close previous round span
    if (prevRound > 0) {
      const prevRoundOwnerId = `${blockId}-round-${prevRound}`;
      const refs = runtime.memory.search({
        type: EXECUTION_SPAN_TYPE,
        id: null,
        ownerId: prevRoundOwnerId,
        visibility: null
      });

      if (refs.length > 0) {
        const span = runtime.memory.get(refs[0] as any) as TrackedSpan;
        if (span && span.status === 'active') {
          const updatedSpan: TrackedSpan = {
            ...span,
            endTime: Date.now(),
            status: 'completed'
          };
          runtime.memory.set(refs[0] as any, updatedSpan);
        }
      }
    }

    // 2. Create new round span
    // Only if we are not complete
    if (rounds < (this.config.totalRounds || Infinity)) {
      const newRoundOwnerId = `${blockId}-round-${nextRound}`;
      const spanType = this.config.loopType === LoopType.INTERVAL ? 'interval' : 'round';
      const label = this.config.loopType === LoopType.INTERVAL
        ? `Interval ${nextRound}`
        : `Round ${nextRound}`;

      const startTime = Date.now();

      // Create metrics with round info
      const metrics = createEmptyMetrics();
      metrics.currentRound = nextRound;
      if (this.config.totalRounds) {
        metrics.totalRounds = this.config.totalRounds;
      }
      if (this.config.repScheme) {
        metrics.repScheme = this.config.repScheme;
        // Set target reps for this specific round using modulo to cycle
        // E.g., 21-15-9: round 0 → 21, round 1 → 15, round 2 → 9, round 3 → 21, etc.
        const schemeIndex = rounds % this.config.repScheme.length;
        metrics.targetReps = this.config.repScheme[schemeIndex];
      }

      const span: TrackedSpan = {
        id: `${startTime}-${newRoundOwnerId}`,
        blockId: newRoundOwnerId,
        parentSpanId: blockId, // Parent is the RoundsBlock/TimerBlock
        type: spanType as any,
        label: label,
        startTime: startTime,
        status: 'active',
        metrics: metrics,
        segments: []
      };

      runtime.memory.allocate(EXECUTION_SPAN_TYPE, newRoundOwnerId, span, 'public');

      // Create lap timer for this round
      const lapTimerRef = runtime.memory.allocate<TimeSpan[]>(
        `timer:lap:${block.key}:${rounds}`,
        block.key.toString(),
        [{ start: Date.now(), state: 'new' }],
        'public'
      );

      // Track lap timer ref for cleanup
      this.lapTimerRefs.push(lapTimerRef);

      // Update display state
      const stateRefs = runtime.memory.search({
        id: null,
        ownerId: 'runtime',
        type: MemoryTypeEnum.DISPLAY_STACK_STATE,
        visibility: null
      });

      if (stateRefs.length > 0) {
        const stateRef = stateRefs[0] as TypedMemoryReference<IDisplayStackState>;
        const state = stateRef.get();
        if (state) {
          stateRef.set({ ...state, currentLapTimerMemoryId: lapTimerRef.id });
        }
      }

      // For INTERVAL loops (EMOM), restart the timer for the new round
      if (this.config.loopType === LoopType.INTERVAL) {
        const timerBehavior = block.getBehavior(TimerBehavior);
        if (timerBehavior) {
          timerBehavior.restart();
        }
      }
    }
  }
}
