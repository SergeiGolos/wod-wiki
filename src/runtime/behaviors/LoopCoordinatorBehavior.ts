import { CodeStatement } from '../../core/models/CodeStatement';
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { PushBlockAction } from '../PushBlockAction';
import { TimerBehavior, TimeSpan } from './TimerBehavior';
import { SetRoundsDisplayAction } from '../actions/WorkoutStateActions';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { TypedMemoryReference } from '../IMemoryReference';
import { IDisplayStackState } from '../../clock/types/DisplayTypes';

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
    // Pass the block explicitly
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
    if (this.isComplete(runtime, _block)) {
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
      this.emitRoundChanged(runtime, state.rounds, _block);
      
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

      // Return PushBlockAction to push the compiled child onto the stack
      actions.push(new PushBlockAction(compiledBlock));
      return actions;
    } catch (error) {
      console.error(`LoopCoordinatorBehavior: Compilation failed for position ${state.position}:`, error);
      return actions;
    }
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
    // Close the current round record if it exists
    const state = this.getState();
    const currentRound = state.rounds + 1;
    const roundId = `${block.key.toString()}-round-${currentRound}`;
    
    const refs = runtime.memory.search({ 
        type: 'execution-record', 
        id: roundId,
        ownerId: block.key.toString(), 
        visibility: null 
    });

    if (refs.length > 0) {
        const record = runtime.memory.get(refs[0] as any) as any;
        if (record && record.status === 'active') {
            const updatedRecord = {
                ...record,
                endTime: Date.now(),
                status: 'completed'
            };
            runtime.memory.set(refs[0] as any, updatedRecord);
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

    // 1. Close previous round record
    if (prevRound > 0) {
        const prevRoundId = `${blockId}-round-${prevRound}`;
        const refs = runtime.memory.search({ 
            type: 'execution-record', 
            id: prevRoundId,
            ownerId: blockId, 
            visibility: null 
        });

        if (refs.length > 0) {
            const record = runtime.memory.get(refs[0] as any) as any;
            if (record && record.status === 'active') {
                const updatedRecord = {
                    ...record,
                    endTime: Date.now(),
                    status: 'completed'
                };
                runtime.memory.set(refs[0] as any, updatedRecord);
            }
        }
    }

    // 2. Create new round record
    // Only if we are not complete
    if (rounds < (this.config.totalRounds || Infinity)) {
        const newRoundId = `${blockId}-round-${nextRound}`;
        const label = this.config.loopType === LoopType.INTERVAL 
            ? `Interval ${nextRound}`
            : `Round ${nextRound}`;
            
        const record = {
            id: newRoundId,
            blockId: blockId, // It belongs to this block
            parentId: blockId, // It is a child of this block
            type: this.config.loopType === LoopType.INTERVAL ? 'interval' : 'round',
            label: label,
            startTime: Date.now(),
            status: 'active',
            metrics: []
        };

        runtime.memory.allocate('execution-record', blockId, record, 'public');

        // Create lap timer for this round
        const lapTimerRef = runtime.memory.allocate<TimeSpan[]>(
          `timer:lap:${block.key}:${rounds}`,
          block.key.toString(),
          [{ start: Date.now() }],
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
    }
  }
}
