import { ICodeFragment } from '../../core/models/CodeFragment';
import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { BlockLifecycleOptions, IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IEvent } from '../contracts/events/IEvent';
import { CompletionBehavior } from '../behaviors/CompletionBehavior';
import { PushStackItemAction, PopStackItemAction } from '../actions/stack/StackActions';
import { EmitEventAction } from '../actions/events/EmitEventAction';
import { TrackMetricAction } from '../actions/tracking/TrackMetricAction';
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
 * NextEventBehavior - Sets forceComplete flag when 'next' event is received.
 */
class NextEventBehavior implements IRuntimeBehavior {
  constructor(private readonly setForceComplete: () => void) { }

  onEvent(event: IEvent, _block: IRuntimeBlock): IRuntimeAction[] {
    if (event.name === 'next') {
      this.setForceComplete();
    }
    return [];
  }

  onPush(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] { return []; }
  onNext(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] { return []; }
  onPop(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] { return []; }
  onDispose(_block: IRuntimeBlock): void { }
}

/**
 * EffortBlock tracks individual exercise/rep completion.
 */
export class EffortBlock extends RuntimeBlock {
  private currentReps = 0;
  private lastCompletionMode: 'incremental' | 'bulk' = 'incremental';
  private _forceComplete = false;

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

    const nextEventBehavior = new NextEventBehavior(() => {
      this._forceComplete = true;
    });

    const completionBehavior = new CompletionBehavior(
      () => this.isComplete() || this._forceComplete,
      ['reps:updated', 'next']
    );

    // Initialize behaviors in order
    this.behaviors.push(new ActionLayerBehavior(this.key.toString(), fragments ?? [], sourceIds));
    this.behaviors.push(nextEventBehavior);
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
