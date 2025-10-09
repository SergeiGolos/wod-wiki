import { BlockKey } from '../../BlockKey';
import { CodeStatement } from '../../CodeStatement';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeAction } from '../IRuntimeAction';
import { RoundsBehavior } from '../behaviors/RoundsBehavior';
import { CompletionBehavior } from '../behaviors/CompletionBehavior';
import { ChildAdvancementBehavior } from '../behaviors/ChildAdvancementBehavior';
import { LazyCompilationBehavior } from '../behaviors/LazyCompilationBehavior';

/**
 * RoundsBlock Configuration
 */
export interface RoundsBlockConfig {
  totalRounds: number;
  repScheme?: number[];
  children: CodeStatement[];
}

/**
 * RoundsBlock manages multi-round workout execution.
 * 
 * Features:
 * - Fixed rounds (e.g., "3 rounds")
 * - Variable rep schemes (e.g., "21-15-9")
 * - Infinite rounds (AMRAP - As Many Rounds As Possible)
 * - Lazy compilation of round contents
 * - Provides compilation context to child blocks
 * - Emits rounds:changed when advancing
 * - Emits rounds:complete when finished
 * 
 * API Contract: contracts/runtime-blocks-api.md
 */
export class RoundsBlock extends RuntimeBlock {
  private roundsBehavior: RoundsBehavior;

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

    // Create behaviors
    const roundsBehavior = new RoundsBehavior(config.totalRounds, config.repScheme);
    const completionBehavior = new CompletionBehavior(
      () => roundsBehavior.isComplete(),
      ['rounds:complete']
    );
    const childAdvancementBehavior = new ChildAdvancementBehavior();
    const lazyCompilationBehavior = new LazyCompilationBehavior();

    // Initialize RuntimeBlock with behaviors
    super(
      runtime,
      sourceIds,
      config.children,
      undefined,
      [
        roundsBehavior,
        completionBehavior,
        childAdvancementBehavior,
        lazyCompilationBehavior
      ]
    );

    // Store reference to rounds behavior for context access
    this.roundsBehavior = roundsBehavior;
  }

  /**
   * Get current round (1-indexed).
   */
  getCurrentRound(): number {
    return this.roundsBehavior.getCurrentRound();
  }

  /**
   * Get total rounds configured.
   */
  getTotalRounds(): number {
    return this.roundsBehavior.getTotalRounds();
  }

  /**
   * Get number of completed rounds.
   */
  getCompletedRounds(): number {
    return this.roundsBehavior.getCompletedRounds();
  }

  /**
   * Check if all rounds are complete.
   */
  isComplete(): boolean {
    return this.roundsBehavior.isComplete();
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
    return this.roundsBehavior.getCompilationContext();
  }

  /**
   * Get reps for current round from rep scheme.
   * Returns undefined if no rep scheme configured.
   */
  getRepsForCurrentRound(): number | undefined {
    return this.roundsBehavior.getCompilationContext().getRepsForCurrentRound();
  }
}
