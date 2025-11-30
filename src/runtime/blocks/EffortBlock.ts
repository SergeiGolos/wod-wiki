import { RuntimeBlock } from '../RuntimeBlock';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeAction } from '../IRuntimeAction';
import { CompletionBehavior } from '../behaviors/CompletionBehavior';
import { PushStackItemAction, PopStackItemAction } from '../actions/StackActions';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { CurrentMetrics } from '../models/MemoryModels';

/**
 * EffortBlock Configuration
 */
export interface EffortBlockConfig {
  exerciseName: string;
  targetReps: number;
}

/**
 * EffortBlock tracks individual exercise/rep completion.
 * 
 * Features:
 * - Hybrid rep tracking: incremental (tap button) or bulk entry
 * - Validates rep counts within valid range [0, targetReps]
 * - Emits reps:updated on every rep change
 * - Emits reps:complete when target reached
 * - Tracks completion mode (incremental vs bulk)
 * - No children (terminal block in workout hierarchy)
 * 
 * API Contract: contracts/runtime-blocks-api.md
 */
export class EffortBlock extends RuntimeBlock {
  private currentReps = 0;
  private lastCompletionMode: 'incremental' | 'bulk' = 'incremental';

  constructor(
    runtime: IScriptRuntime,
    sourceIds: number[],
    private readonly config: EffortBlockConfig
  ) {
    // Validate configuration
    if (!config.exerciseName || config.exerciseName.trim() === '') {
      throw new TypeError('EffortBlock requires a non-empty exerciseName');
    }

    if (config.targetReps < 1) {
      throw new RangeError(`targetReps must be >= 1, got: ${config.targetReps}`);
    }

    // Create completion behavior that checks if reps are complete
    const completionBehavior = new CompletionBehavior(
      () => this.isComplete(),
      ['reps:updated']
    );

    // Generate label from exercise name and reps
    const label = `${config.targetReps} ${config.exerciseName}`;

    // Initialize RuntimeBlock with completion behavior
    super(
      runtime,
      sourceIds,
      [completionBehavior],
      "Effort",  // blockType
      undefined, // blockKey
      undefined, // blockTypeParam
      label      // label
    );
  }

  /**
   * Initialize effort tracking when block is mounted onto the stack.
   */
  mount(runtime: IScriptRuntime): IRuntimeAction[] {
    // Update metrics
    this.updateMetrics(runtime);

    // Call parent mount (includes behaviors)
    const actions = super.mount(runtime);

    // Push to display stack
    actions.push(new PushStackItemAction(this.key.toString()));

    return actions;
  }

  /**
   * Cleanup effort tracking when block is unmounted.
   */
  unmount(runtime: IScriptRuntime): IRuntimeAction[] {
    // Call parent unmount (includes behaviors)
    const actions = super.unmount(runtime);

    // Pop from display stack
    actions.push(new PopStackItemAction(this.key.toString()));

    return actions;
  }

  /**
   * Cleanup: release memory reference.
   */
  dispose(_runtime: IScriptRuntime): void {
    // Memory is automatically cleaned up when block is disposed

    // Call parent dispose (includes behaviors)
    super.dispose(_runtime);
  }

  /**
   * Get exercise name.
   */
  getExerciseName(): string {
    return this.config.exerciseName;
  }

  /**
   * Get target rep count.
   */
  getTargetReps(): number {
    return this.config.targetReps;
  }

  /**
   * Get current rep count.
   */
  getCurrentReps(): number {
    return this.currentReps;
  }

  /**
   * Check if target reps reached.
   */
  isComplete(): boolean {
    return this.currentReps >= this.config.targetReps;
  }

  /**
   * Increment rep count by 1 (incremental tracking).
   * Emits reps:updated event.
   */
  incrementRep(): void {
    if (this.currentReps < this.config.targetReps) {
      this.currentReps++;
      this.lastCompletionMode = 'incremental';
      this.updateMetrics(this._runtime);
    }
  }

  /**
   * Set rep count to specific value (bulk entry).
   * Validates range [0, targetReps].
   * Emits reps:updated event.
   */
  setReps(count: number): void {
    if (count < 0 || count > this.config.targetReps) {
      throw new RangeError(
        `setReps(${count}) out of valid range [0, ${this.config.targetReps}]`
      );
    }

    this.currentReps = count;
    this.lastCompletionMode = 'bulk';
    this.updateMetrics(this._runtime);
  }

  /**
   * Force completion by setting reps to target.
   * Emits reps:complete event.
   */
  markComplete(): void {
    this.currentReps = this.config.targetReps;
    this.lastCompletionMode = 'bulk';

    // Update metrics
    this.updateMetrics(this._runtime);

    // Emit reps:complete event
    this._runtime.handle({
      name: 'reps:complete',
      timestamp: new Date(),
      data: {
        blockId: this.key.toString(),
        exerciseName: this.config.exerciseName,
        finalReps: this.currentReps,
      },
    });
  }

  /**
   * Update memory and emit reps:updated event.
   * Helper method for incrementRep() and setReps().
   */
  private updateMetrics(runtime: IScriptRuntime): void {
    const metricsRef = runtime.memory.allocate<CurrentMetrics>(
        MemoryTypeEnum.METRICS_CURRENT,
        'runtime',
        {},
        'public'
    );
    const metrics = metricsRef.get() || {};
    metrics['reps'] = {
        value: this.currentReps,
        unit: 'reps',
        sourceId: this.key.toString()
    };
    metricsRef.set({ ...metrics });

    // Emit reps:updated event
    this._runtime.handle({
      name: 'reps:updated',
      timestamp: new Date(),
      data: {
        blockId: this.key.toString(),
        exerciseName: this.config.exerciseName,
        currentReps: this.currentReps,
        targetReps: this.config.targetReps,
        completionMode: this.lastCompletionMode,
      },
    });

    // Check if complete and emit reps:complete if so
    if (this.isComplete()) {
      this._runtime.handle({
        name: 'reps:complete',
        timestamp: new Date(),
        data: {
          blockId: this.key.toString(),
          exerciseName: this.config.exerciseName,
          finalReps: this.currentReps,
        },
      });
    }
  }
}
