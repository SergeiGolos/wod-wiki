import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeAction } from '../IRuntimeAction';
import { CompletionBehavior } from '../behaviors/CompletionBehavior';
import { LoopCoordinatorBehavior, LoopType } from '../behaviors/LoopCoordinatorBehavior';
import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { TypedMemoryReference } from '../IMemoryReference';
import { HistoryBehavior } from '../behaviors/HistoryBehavior';
import { PushCardDisplayAction, PopCardDisplayAction, UpdateCardDisplayAction } from '../actions/CardDisplayActions';
import { SetRoundsDisplayAction } from '../actions/WorkoutStateActions';

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
  private repsMetricRef?: TypedMemoryReference<number>;

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
      label      // label
    );

    // Store reference to loop coordinator for context access
    this.loopCoordinator = loopCoordinator;

    // Allocate public reps metric for child blocks to inherit
    // Initialize with first round's reps (from rep scheme if available)
    if (config.repScheme && config.repScheme.length > 0) {
      const initialReps = config.repScheme[0];
      this.repsMetricRef = this.allocate<number>({
        type: MemoryTypeEnum.METRIC_REPS,
        visibility: 'public',
        initialValue: initialReps
      });
      console.log(`📊 RoundsBlock allocated public reps metric: ${initialReps} (round 1/${config.totalRounds})`);
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
  mount(runtime: IScriptRuntime): IRuntimeAction[] {
    // Call parent mount (includes behaviors)
    const actions = super.mount(runtime);

    // Update rounds display state
    actions.push(new SetRoundsDisplayAction(
      this.getCurrentRound(),
      this.getTotalRounds()
    ));

    // Push activity card for rounds context
    actions.push(new PushCardDisplayAction({
      id: `card-${this.key.toString()}`,
      ownerId: this.key.toString(),
      type: 'active-block',
      title: this.label,
      subtitle: `Round ${this.getCurrentRound()} of ${this.getTotalRounds()}`,
      metrics: this.config.repScheme ? [{
        type: 'reps',
        value: `${this.getRepsForCurrentRound() || '?'} reps`,
        isActive: true,
      }] : [{
        type: 'rounds',
        value: `${this.getCurrentRound()}/${this.getTotalRounds()}`,
        isActive: true,
      }],
      priority: 25, // Between timer and effort
    }));

    return actions;
  }

  /**
   * Unmount the rounds block and pop display entries.
   */
  unmount(runtime: IScriptRuntime): IRuntimeAction[] {
    const actions = super.unmount(runtime);

    // Pop the activity card
    actions.push(new PopCardDisplayAction(`card-${this.key.toString()}`));

    // Clear rounds display state
    actions.push(new SetRoundsDisplayAction(undefined, undefined));

    return actions;
  }

  /**
   * Override next() to update public reps metric and display after round advances.
   */
  next(runtime: IScriptRuntime): IRuntimeAction[] {
    // Call parent implementation (invokes behaviors)
    const actions = super.next(runtime);

    // Update public reps metric if rep scheme is configured
    if (this.repsMetricRef && this.config.repScheme) {
      const currentRound = this.getCurrentRound() - 1; // Convert to 0-indexed
      if (currentRound >= 0 && currentRound < this.config.repScheme.length) {
        const currentReps = this.config.repScheme[currentRound];
        runtime.memory.set(this.repsMetricRef, currentReps);
        console.log(`📊 RoundsBlock updated public reps metric: ${currentReps} (round ${currentRound + 1}/${this.config.totalRounds})`);
      }
    }

    // Update rounds display state
    actions.push(new SetRoundsDisplayAction(
      this.getCurrentRound(),
      this.getTotalRounds()
    ));

    // Update activity card with new round info
    actions.push(new UpdateCardDisplayAction(
      `card-${this.key.toString()}`,
      {
        subtitle: `Round ${this.getCurrentRound()} of ${this.getTotalRounds()}`,
        metrics: this.config.repScheme ? [{
          type: 'reps',
          value: `${this.getRepsForCurrentRound() || '?'} reps`,
          isActive: true,
        }] : [{
          type: 'rounds',
          value: `${this.getCurrentRound()}/${this.getTotalRounds()}`,
          isActive: true,
        }],
      }
    ));

    return actions;
  }
}
