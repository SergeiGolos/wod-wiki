import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';

/**
 * RoundsBehavior manages round tracking and variable rep schemes.
 * 
 * Features:
 * - Tracks current round (1-indexed)
 * - Supports fixed rounds with same reps each round
 * - Supports variable rep schemes (e.g., 21-15-9)
 * - Provides compilation context for child blocks
 * - Emits rounds:changed when advancing rounds
 * - Emits rounds:complete when all rounds finished
 * 
 * API Contract: contracts/runtime-blocks-api.md
 */
export class RoundsBehavior implements IRuntimeBehavior {
  private currentRound = 0;
  private memoryRef?: string;

  constructor(
    private readonly totalRounds: number,
    private readonly repScheme?: number[]
  ) {
    // Validate totalRounds
    if (totalRounds < 1) {
      throw new RangeError(`totalRounds must be >= 1, got: ${totalRounds}`);
    }

    // Validate repScheme if provided
    if (repScheme !== undefined) {
      if (repScheme.length !== totalRounds) {
        throw new RangeError(
          `repScheme length (${repScheme.length}) must match totalRounds (${totalRounds})`
        );
      }

      // Validate each rep value
      for (let i = 0; i < repScheme.length; i++) {
        if (repScheme[i] <= 0) {
          throw new RangeError(
            `repScheme[${i}] must be > 0, got: ${repScheme[i]}`
          );
        }
      }
    }
  }

  /**
   * Initialize round tracking when block is pushed onto the stack.
   */
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Initialize currentRound to 1
    this.currentRound = 1;

    // Allocate memory for round tracking
    this.memoryRef = runtime.memory.allocate(
      `rounds:${block.key.toString()}`,
      {
        currentRound: this.currentRound,
        totalRounds: this.totalRounds,
        completedRounds: 0,
      }
    );

    return [];
  }

  /**
   * Advance to the next round.
   * Called when current round's children complete.
   */
  onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    // Advance to next round
    this.currentRound++;

    // Update memory
    if (this.memoryRef) {
      const state = runtime.memory.get(this.memoryRef);
      if (state) {
        state.currentRound = this.currentRound;
        state.completedRounds = this.currentRound - 1;
        runtime.memory.set(this.memoryRef, state);
      }
    }

    // Check if all rounds complete
    if (this.currentRound > this.totalRounds) {
      // Emit rounds:complete event
      runtime.handle({
        name: 'rounds:complete',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          totalRoundsCompleted: this.totalRounds,
        },
      });
    } else {
      // Emit rounds:changed event
      runtime.handle({
        name: 'rounds:changed',
        timestamp: new Date(),
        data: {
          blockId: block.key.toString(),
          currentRound: this.currentRound,
          totalRounds: this.totalRounds,
          completedRounds: this.currentRound - 1,
        },
      });
    }

    return [];
  }

  /**
   * Cleanup: release memory reference.
   */
  onDispose(runtime: IScriptRuntime, _block: IRuntimeBlock): void {
    if (this.memoryRef) {
      runtime.memory.release(this.memoryRef);
      this.memoryRef = undefined;
    }
  }

  /**
   * Get current round (1-indexed).
   */
  getCurrentRound(): number {
    return this.currentRound;
  }

  /**
   * Get total rounds configured.
   */
  getTotalRounds(): number {
    return this.totalRounds;
  }

  /**
   * Get number of completed rounds.
   */
  getCompletedRounds(): number {
    return Math.max(0, this.currentRound - 1);
  }

  /**
   * Check if all rounds are complete.
   */
  isComplete(): boolean {
    return this.currentRound > this.totalRounds;
  }

  /**
   * Get compilation context for current round.
   * Used by JIT compiler to provide round-specific data to child blocks.
   */
  getCompilationContext(): {
    currentRound: number;
    totalRounds: number;
    repScheme?: number[];
    getRepsForCurrentRound(): number | undefined;
  } {
    return {
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      repScheme: this.repScheme,
      getRepsForCurrentRound: () => {
        if (this.repScheme && this.currentRound >= 1 && this.currentRound <= this.totalRounds) {
          return this.repScheme[this.currentRound - 1];
        }
        return undefined;
      },
    };
  }
}
