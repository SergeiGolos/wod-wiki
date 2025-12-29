import { ICodeFragment } from '../../core/models/CodeFragment';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { BlockLifecycleOptions, IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IEvent } from '../contracts/events/IEvent';
import { PushStackItemAction, PopStackItemAction } from '../actions/stack/StackActions';
import { EmitEventAction } from '../actions/events/EmitEventAction';
import { TrackMetricAction } from '../actions/tracking/TrackMetricAction';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { UnboundTimerBehavior } from '../behaviors/UnboundTimerBehavior';
import { ActionLayerBehavior } from '../behaviors/ActionLayerBehavior';

/**
 * EffortBlock Configuration
 */
export interface EffortBlockConfig {
  exerciseName: string;
  targetReps: number;
}

/**
 * EffortCompletionBehavior - Handles completion via onNext() to avoid conflicts with NextEventHandler.
 * Pops the block when complete or when force-completed.
 */
class EffortCompletionBehavior implements IRuntimeBehavior {
  private _forceComplete = false;
  private _isComplete = false;

  constructor(private readonly checkComplete: () => boolean) { }

  forceComplete(): void {
    this._forceComplete = true;
  }

  onEvent(event: IEvent, _block: IRuntimeBlock): IRuntimeAction[] {
    // Set force complete flag when 'next' event received, but DON'T return actions
    // The actual pop happens in onNext() which is called by NextAction
    if (event.name === 'next') {
      this._forceComplete = true;
    }
    return [];
  }

  onPush(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] { return []; }
  
  onNext(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    if (this._isComplete) {
      return [];
    }

    if (this.checkComplete() || this._forceComplete) {
      this._isComplete = true;
      const now = options?.now ?? new Date();
      return [
        new EmitEventAction('block:complete', { blockId: block.key.toString() }, now),
        new PopBlockAction()
      ];
    }

    return [];
  }

  onPop(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] { return []; }
  onDispose(_block: IRuntimeBlock): void { }
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

    const completionBehavior = new EffortCompletionBehavior(() => this.isComplete());

    // Initialize behaviors in order
    this.behaviors.push(new ActionLayerBehavior(this.key.toString(), fragments ?? [], sourceIds));
    this.behaviors.push(completionBehavior);
    this.behaviors.push(new UnboundTimerBehavior('Segment Timer', 'secondary'));
  }

  mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const actions = super.mount(runtime, options);
    actions.push(...this.getMetricActions());
    actions.push(new PushStackItemAction(this.key.toString()));
    return actions;
  }

  unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
    const actions = super.unmount(runtime, options);
    actions.push(new PopStackItemAction(this.key.toString()));
    return actions;
  }

  dispose(runtime: IScriptRuntime): void {
    super.dispose(runtime);
    if (this.context) {
      this.context.release();
    }
  }

  isComplete(): boolean {
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

    // 3. Check complete
    if (this.isComplete()) {
      actions.push(new EmitEventAction('reps:complete', {
        blockId,
        exerciseName: this.config.exerciseName,
        finalReps: this.currentReps,
      }));
    }

    return actions;
  }
}
