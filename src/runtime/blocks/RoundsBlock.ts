import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { CompletionBehavior } from '../behaviors/CompletionBehavior';
import { LoopCoordinatorBehavior, LoopType } from '../behaviors/LoopCoordinatorBehavior';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';

import { HistoryBehavior } from '../behaviors/HistoryBehavior';
import { PushStackItemAction, PopStackItemAction } from '../actions/StackActions';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { ActionLayerBehavior } from '../behaviors/ActionLayerBehavior';
import { ICodeFragment } from '../../core/models/CodeFragment';

/**
 * RoundsBlock Configuration
 */
export interface RoundsBlockConfig {
  totalRounds: number;
  repScheme?: number[];
  /** Child statement IDs grouped by execution. Each number[] is compiled together. */
  children: number[][];
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
    private readonly config: RoundsBlockConfig,
    fragments?: ICodeFragment[][]
  ) {
    // Validate configuration
    if (config.totalRounds < 1) {
      throw new RangeError(`totalRounds must be >= 1, got: ${config.totalRounds}`);
    }

    if (!config.children || config.children.length === 0) {
      throw new TypeError('RoundsBlock requires non-empty children array');
    }

    if (config.repScheme !== undefined) {
      // Rep scheme cycles via modulo - no need to match totalRounds
      // E.g., 21-15-9 with 5 rounds: 21, 15, 9, 21, 15

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
      childGroups: config.children, // Already grouped number[][] from parser
      loopType,
      totalRounds: config.totalRounds,
      repScheme: config.repScheme,
    });

    const behaviors: IRuntimeBehavior[] = [
      loopCoordinator,
      // Completion behavior delegates to loop coordinator
      new CompletionBehavior(
        () => loopCoordinator.isComplete(runtime, this),
        ['rounds:complete']
      ),
      new HistoryBehavior("Rounds")
    ];

    // Generate label based on configuration
    const label = config.repScheme
      ? config.repScheme.join('-')
      : `${config.totalRounds} Round${config.totalRounds !== 1 ? 's' : ''}`;

    // Initialize RuntimeBlock with behaviors
    super(
      runtime,
      sourceIds,
      behaviors,
      "Rounds",  // blockType
      undefined, // blockKey
      undefined, // blockTypeParam
      label,     // label
      fragments
    );

    // Expose actions from fragments + default next
    this.behaviors.unshift(new ActionLayerBehavior(this.key.toString(), fragments ?? [], sourceIds));

    // Store reference to loop coordinator for context access
    this.loopCoordinator = loopCoordinator;

    // Allocate public reps metric for child blocks to inherit
    // Initialize with first round's reps (from rep scheme if available)
    if (config.repScheme && config.repScheme.length > 0) {
      //const initialReps = config.repScheme[0];
      // We'll update the global metrics object instead of a specific ref

    }
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
   * Get reps for current round from rep scheme.
   * Returns undefined if no rep scheme configured.
   */
  getRepsForCurrentRound(): number | undefined {
    return this.loopCoordinator.getRepsForCurrentRound();
  }

  /**
   * Mount the rounds block and push display entries.
   */
  mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    // Call parent mount (includes behaviors)
    const actions = super.mount(runtime, options);

    // Push to display stack
    actions.push(new PushStackItemAction(this.key.toString()));

    // Initialize metrics if needed
    this.updateMetrics(runtime);

    return actions;
  }

  /**
   * Unmount the rounds block and pop display entries.
   */
  unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const actions = super.unmount(runtime, options);

    // Pop from display stack
    actions.push(new PopStackItemAction(this.key.toString()));

    return actions;
  }

  /**
   * Override next() to update public reps metric and display after round advances.
   */
  next(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    // Call parent implementation (invokes behaviors)
    const actions = super.next(runtime, options);

    // Update metrics for new round
    this.updateMetrics(runtime);

    return actions;
  }

  /**
   * Update metrics for current round.
   * 
   * Note: METRICS_CURRENT memory slot removed in Phase 3.
   * Rep scheme information is available via block.fragments and events.
   * UI components now read directly from block state or subscribe to rounds:changed events.
   */
  private updateMetrics(_runtime: IScriptRuntime): void {
    // Rep scheme metrics now handled via fragments and events
    // The current round reps are accessible via getRepsForCurrentRound()
    // and emitted in rounds:changed events
  }
}
