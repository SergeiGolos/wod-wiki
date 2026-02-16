import { ICodeFragment } from '../../core/models/CodeFragment';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { BlockLifecycleOptions } from '../contracts/IRuntimeBlock';
import { EmitEventAction } from '../actions/events/EmitEventAction';
import { TrackMetricAction } from '../actions/tracking/TrackMetricAction';
import { TimerBehavior } from '../behaviors/TimerBehavior';
import { DisplayInitBehavior } from '../behaviors/DisplayInitBehavior';


/**
 * EffortBlock Configuration
 */
export interface EffortBlockConfig {
  exerciseName: string;
  targetReps: number;
}

/**
 * EffortCompletionBehavior - Handles completion via onNext() to avoid conflicts with NextEventHandler.
 * Marks the block as complete when target is achieved or when force-completed.
 */
class EffortCompletionBehavior implements IRuntimeBehavior {
  private _forceComplete = false;
  private _isComplete = false;

  constructor(private readonly checkComplete: () => boolean) { }

  forceComplete(): void {
    this._forceComplete = true;
  }

  onMount(ctx: IBehaviorContext): IRuntimeAction[] {
    // Set force complete flag when 'next' event received
    // The actual completion happens in onNext()
    ctx.subscribe('next', () => {
      this._forceComplete = true;
      return [];
    });
    return [];
  }

  onNext(ctx: IBehaviorContext): IRuntimeAction[] {
    if (this._isComplete) {
      return [];
    }

    if (this.checkComplete() || this._forceComplete) {
      this._isComplete = true;
      const now = ctx.clock.now;
      // Mark block as complete - stack will pop it during sweep
      ctx.markComplete('target-achieved');
      return [
        new EmitEventAction('block:complete', { blockId: ctx.block.key.toString() }, now)
      ];
    }

    return [];
  }

  onUnmount(_ctx: IBehaviorContext): IRuntimeAction[] {
    return [];
  }

  onDispose(_ctx: IBehaviorContext): void {
    // No explicit cleanup needed
  }
}

/**
 * EffortBlock tracks individual exercise/rep completion.
 */
export class EffortBlock extends RuntimeBlock {
  private currentReps = 0;
  private lastCompletionMode: 'incremental' | 'bulk' = 'incremental';

  constructor(
    runtime: IScriptRuntime,
    sourceIds: number[],
    private readonly config: EffortBlockConfig,
    fragments?: ICodeFragment[][]
  ) {
    super(
      runtime,
      sourceIds,
      [], // Behaviors added below
      "Effort",
      undefined,
      undefined,
      `${config.targetReps} ${config.exerciseName}`,
      fragments
    );

    // Validate configuration
    if (!config.exerciseName || config.exerciseName.trim() === '') {
      throw new TypeError('EffortBlock requires a non-empty exerciseName');
    }

    if (config.targetReps < 1) {
      throw new RangeError(`targetReps must be >= 1, got: ${config.targetReps}`);
    }

    const completionBehavior = new EffortCompletionBehavior(() => this.isTargetComplete());

    // Initialize behaviors in order
    // Display aspect
    this.behaviors.push(new DisplayInitBehavior({
      mode: 'clock',
      label: `${config.targetReps} ${config.exerciseName}`,
      actionDisplay: config.exerciseName
    }));
    this.behaviors.push(completionBehavior);
    // Timer aspect - countup timer for segment timing
    this.behaviors.push(new TimerBehavior({
      direction: 'up',
      label: 'Segment Timer',
      role: 'secondary'
    }));
  }

  mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const actions = super.mount(runtime, options);
    actions.push(...this.getMetricActions());
    return actions;
  }

  unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    return super.unmount(runtime, options);
  }

  dispose(runtime: IScriptRuntime): void {
    super.dispose(runtime);
    if (this.context) {
      this.context.release();
    }
  }

  /**
   * Check if the effort target has been met.
   * Note: This is distinct from the block's isComplete flag which is used by the stack.
   */
  isTargetComplete(): boolean {
    return this.currentReps >= this.config.targetReps;
  }

  getCurrentReps(): number {
    return this.currentReps;
  }

  getTargetReps(): number {
    return this.config.targetReps;
  }

  getExerciseName(): string {
    return this.config.exerciseName;
  }

  incrementRep(): IRuntimeAction[] {
    if (this.currentReps < this.config.targetReps) {
      this.currentReps++;
      this.lastCompletionMode = 'incremental';
      return this.getMetricActions();
    }
    return [];
  }

  setReps(count: number): IRuntimeAction[] {
    if (count < 0 || count > this.config.targetReps) {
      throw new RangeError(`setReps(${count}) out of valid range [0, ${this.config.targetReps}]`);
    }

    this.currentReps = count;
    this.lastCompletionMode = 'bulk';
    return this.getMetricActions();
  }

  markComplete(): IRuntimeAction[] {
    this.currentReps = this.config.targetReps;
    this.lastCompletionMode = 'bulk';
    const actions = this.getMetricActions();

    actions.push(new EmitEventAction('reps:complete', {
      blockId: this.key.toString(),
      exerciseName: this.config.exerciseName,
      finalReps: this.currentReps,
    }));

    return actions;
  }

  private getMetricActions(): IRuntimeAction[] {
    const blockId = this.key.toString();
    const actions: IRuntimeAction[] = [];

    // 1. Sync to tracker via action
    actions.push(new TrackMetricAction(blockId, 'reps', this.currentReps, 'reps'));

    // 2. Emit event for UI
    actions.push(new EmitEventAction('reps:updated', {
      blockId,
      exerciseName: this.config.exerciseName,
      currentReps: this.currentReps,
      targetReps: this.config.targetReps,
      completionMode: this.lastCompletionMode,
    }));

    // 3. Check if target is complete
    if (this.isTargetComplete()) {
      actions.push(new EmitEventAction('reps:complete', {
        blockId,
        exerciseName: this.config.exerciseName,
        finalReps: this.currentReps,
      }));
    }

    return actions;
  }
}
