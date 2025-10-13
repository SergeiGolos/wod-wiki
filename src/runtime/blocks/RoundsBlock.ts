import { BlockKey } from '../../BlockKey';
import { CodeStatement } from '../../CodeStatement';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeAction } from '../IRuntimeAction';
import { CompletionBehavior } from '../behaviors/CompletionBehavior';
import { LoopCoordinatorBehavior, LoopType } from '../behaviors/LoopCoordinatorBehavior';
import { IRuntimeBehavior } from '../IRuntimeBehavior';

/**
 * RoundsBlock Configuration
 */
export interface RoundsBlockConfig {
  totalRounds: number;
  repScheme?: number[];
  children: CodeStatement[];
}

/**
 * RoundsBlock manages multi-round workout execution using LoopCoordinatorBehavior.
 * 
 * Features:
 * - Fixed rounds (e.g., "3 rounds")
 * - Variable rep schemes (e.g., "21-15-9")
 * - Infinite rounds (AMRAP - As Many Rounds As Possible)
 * - Automatic child cycling and compilation with context
 * - Provides compilation context to child blocks (including reps)
 * - Emits rounds:changed when advancing
 * - Emits rounds:complete when finished
 * 
 * API Contract: contracts/runtime-blocks-api.md
 */
export class RoundsBlock extends RuntimeBlock {
  private loopCoordinator: LoopCoordinatorBehavior;

  constructor(
    runtime: IScriptRuntime,
    sourceIds: number[],
    private readonly config: RoundsBlockConfig
  ) {
    // Validate configuration
    if (config.totalRounds < 1) {
      throw new RangeError(`totalRounds must be >= 1, got: ${config.totalRounds}`);
    }

    if (!config.children || config.children.length === 0) {
      throw new TypeError('RoundsBlock requires non-empty children array');
    }

    if (config.repScheme !== undefined) {
      if (config.repScheme.length !== config.totalRounds) {
        throw new RangeError(
          `repScheme length (${config.repScheme.length}) must match totalRounds (${config.totalRounds})`
        );
      }

      for (let i = 0; i < config.repScheme.length; i++) {
        if (config.repScheme[i] <= 0) {
          throw new RangeError(
            `repScheme[${i}] must be > 0, got: ${config.repScheme[i]}`
          );
        }
      }
    }

    // Create behaviors using unified LoopCoordinatorBehavior
    const loopType = config.repScheme ? LoopType.REP_SCHEME : LoopType.FIXED;
    const loopCoordinator = new LoopCoordinatorBehavior({
      childGroups: [config.children], // Single group for now (no compose grouping yet)
      loopType,
      totalRounds: config.totalRounds,
      repScheme: config.repScheme,
    });
    
    const behaviors: IRuntimeBehavior[] = [
      loopCoordinator,
      // Completion behavior delegates to loop coordinator
      new CompletionBehavior(
        () => loopCoordinator.isComplete(runtime),
        ['rounds:complete']
      )
    ];

    // Initialize RuntimeBlock with behaviors
    super(
      runtime,
      sourceIds,
      behaviors,
      "Rounds"  // blockType
    );

    // Store reference to loop coordinator for context access
    this.loopCoordinator = loopCoordinator;
  }

  /**
   * Get current round (1-indexed).
   */
  getCurrentRound(): number {
    const state = this.loopCoordinator.getState();
    return state.rounds + 1; // Convert to 1-indexed
  }

  /**
   * Get total rounds configured.
   */
  getTotalRounds(): number {
    // Get from original config passed to loop coordinator
    return this.config.totalRounds;
  }

  /**
   * Get number of completed rounds (0-indexed).
   */
  getCompletedRounds(): number {
    return this.loopCoordinator.getCompletedRounds();
  }

  /**
   * Check if all rounds are complete.
   */
  isComplete(): boolean {
    return this.loopCoordinator.isComplete(this._runtime);
  }

  /**
   * Get compilation context for current round.
   * Used by JIT compiler to provide round-specific data to child blocks.
   */
  getCompilationContext() {
    return this.loopCoordinator.getCompilationContext();
  }

  /**
   * Get reps for current round from rep scheme.
   * Returns undefined if no rep scheme configured.
   */
  getRepsForCurrentRound(): number | undefined {
    return this.loopCoordinator.getRepsForCurrentRound();
  }
}
