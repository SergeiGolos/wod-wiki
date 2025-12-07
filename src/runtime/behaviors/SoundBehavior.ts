import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { TypedMemoryReference } from '../IMemoryReference';
import { PlaySoundAction } from '../actions/PlaySoundAction';
import { IEventHandler } from '../IEventHandler';
import { IEvent } from '../IEvent';
import { 
  SoundBehaviorConfig, 
  SoundCue, 
  SoundState, 
  SoundCueState 
} from '../models/SoundModels';

/**
 * Memory type prefix for sound state.
 */
export const SOUND_MEMORY_TYPE = 'sound-state';

/**
 * SoundBehavior manages audio cue playback synchronized with timer events.
 * 
 * This behavior listens to timer:tick events and triggers sound playback
 * when configured time thresholds are reached. It supports:
 * - Countdown timers (triggers when remaining time <= threshold)
 * - Count-up timers (triggers when elapsed time >= threshold)
 * - Multiple concurrent sound cues
 * - Deduplication to prevent repeated triggers
 * 
 * @example
 * ```typescript
 * // AMRAP timer with countdown warnings
 * const soundBehavior = new SoundBehavior({
 *   direction: 'down',
 *   durationMs: 600000, // 10 minutes
 *   cues: [
 *     { id: '30-sec', threshold: 30000, sound: 'beep' },
 *     { id: '10-sec', threshold: 10000, sound: 'beep' },
 *     { id: 'complete', threshold: 0, sound: 'buzzer' }
 *   ]
 * });
 * ```
 */
export class SoundBehavior implements IRuntimeBehavior {
  private readonly config: SoundBehaviorConfig;
  private soundStateRef?: TypedMemoryReference<SoundState>;
  private handlerId?: string;
  private _blockId?: string;
  private unsubscribe?: () => void;

  /**
   * Creates a new SoundBehavior.
   * 
   * @param config Sound behavior configuration
   * @throws {TypeError} If direction is invalid
   * @throws {RangeError} If countdown timer missing durationMs
   */
  constructor(config: SoundBehaviorConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * Valid direction values for timer-based sound behaviors.
   */
  private static readonly VALID_DIRECTIONS = ['up', 'down'] as const;

  /**
   * Validates the configuration.
   */
  private validateConfig(config: SoundBehaviorConfig): void {
    // Type-safe direction validation using the valid directions constant
    if (!SoundBehavior.VALID_DIRECTIONS.includes(config.direction as typeof SoundBehavior.VALID_DIRECTIONS[number])) {
      throw new TypeError(`Invalid direction: ${config.direction}. Must be 'up' or 'down'.`);
    }

    if (config.direction === 'down' && !config.durationMs) {
      throw new RangeError('durationMs is required for countdown timers (direction: down)');
    }

    if (!config.cues || config.cues.length === 0) {
      throw new RangeError('At least one sound cue must be configured');
    }

    // Validate each cue
    const cueIds = new Set<string>();
    for (const cue of config.cues) {
      if (!cue.id) {
        throw new TypeError('Each sound cue must have an id');
      }
      if (cueIds.has(cue.id)) {
        throw new RangeError(`Duplicate cue id: ${cue.id}`);
      }
      cueIds.add(cue.id);

      if (cue.threshold < 0) {
        throw new RangeError(`Cue threshold must be >= 0, got: ${cue.threshold} for cue ${cue.id}`);
      }

      if (!cue.sound) {
        throw new TypeError(`Cue ${cue.id} must have a sound`);
      }

      if (cue.volume !== undefined && (cue.volume < 0 || cue.volume > 1)) {
        throw new RangeError(`Cue ${cue.id} volume must be between 0.0 and 1.0`);
      }
    }
  }

  /**
   * Called when the block is pushed onto the stack.
   * Initializes sound state and registers event handler for timer:tick.
   */
  onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    this._blockId = block.key.toString();
    
    // Initialize sound state with all cues set to not triggered
    const initialState: SoundState = {
      blockId: this._blockId,
      cues: this.config.cues.map(cue => ({
        cueId: cue.id,
        triggered: false
      }))
    };

    // Allocate memory for sound state
    this.soundStateRef = runtime.memory.allocate<SoundState>(
      `${SOUND_MEMORY_TYPE}-${this._blockId}`,
      this._blockId,
      initialState,
      'private'
    );

    // Create event handler for timer:tick
    this.handlerId = `sound-handler-${this._blockId}`;
    const blockId = this._blockId;
    const self = this;
    
    const eventHandler: IEventHandler = {
      id: this.handlerId,
      name: `SoundBehavior-${blockId}`,
      handler: (event: IEvent, rt: IScriptRuntime): IRuntimeAction[] => {
        return self.handleEvent(event, rt);
      }
    };

    this.unsubscribe = runtime.eventBus.register('timer:tick', eventHandler, this._blockId);
    return [];
  }

  onPop(): IRuntimeAction[] {
    if (this.unsubscribe) {
      try { this.unsubscribe(); } catch (error) { console.error('Error unsubscribing sound handler', error); }
      this.unsubscribe = undefined;
    }
    return [];
  }

  /**
   * Handles timer events and checks if any sound cues should trigger.
   */
  private handleEvent(event: IEvent, runtime: IScriptRuntime): IRuntimeAction[] {
    // Only process timer:tick events
    if (event.name !== 'timer:tick') {
      return [];
    }

    const data = event.data as {
      blockId?: string;
      elapsedMs?: number;
      remainingMs?: number;
      direction?: string;
    };

    // Skip if this tick is not for our block
    if (data.blockId !== this._blockId) {
      return [];
    }

    if (!this.soundStateRef) {
      return [];
    }

    const state = this.soundStateRef.get();
    if (!state) {
      return [];
    }

    const actions: IRuntimeAction[] = [];
    let stateChanged = false;
    const newCueStates = [...state.cues];

    // Check each cue to see if it should trigger
    for (let i = 0; i < this.config.cues.length; i++) {
      const cue = this.config.cues[i];
      const cueState = newCueStates[i];

      // Skip if already triggered
      if (cueState.triggered) {
        continue;
      }

      // Check if threshold is met
      const shouldTrigger = this.shouldTriggerCue(cue, data);

      if (shouldTrigger) {
        // Mark as triggered
        newCueStates[i] = {
          ...cueState,
          triggered: true,
          triggeredAt: Date.now()
        };
        stateChanged = true;

        // Add PlaySoundAction
        actions.push(new PlaySoundAction(
          cue.sound,
          cue.volume ?? 1.0,
          cue.id
        ));
      }
    }

    // Update state if any cues were triggered
    if (stateChanged) {
      this.soundStateRef.set({
        ...state,
        cues: newCueStates
      });
    }

    return actions;
  }

  /**
   * Determines if a cue should trigger based on current timer state.
   */
  private shouldTriggerCue(
    cue: SoundCue,
    tickData: { elapsedMs?: number; remainingMs?: number }
  ): boolean {
    if (this.config.direction === 'down') {
      // Countdown timer: trigger when remaining time <= threshold
      const remaining = tickData.remainingMs;
      if (remaining === undefined) {
        return false;
      }
      return remaining <= cue.threshold;
    } else {
      // Count-up timer: trigger when elapsed time >= threshold
      const elapsed = tickData.elapsedMs;
      if (elapsed === undefined) {
        return false;
      }
      return elapsed >= cue.threshold;
    }
  }

  /**
   * Called when the block is popped from the stack.
   * Unregisters the event handler.
   */
  onPop(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
    if (this.handlerId) {
      return [new UnregisterEventHandlerAction(this.handlerId)];
    }
    return [];
  }

  /**
   * Cleanup resources on disposal.
   */
  onDispose(runtime: IScriptRuntime, block: IRuntimeBlock): void {
    // Memory will be cleaned up automatically when block is disposed
    // Handler should already be unregistered via onPop
    this.soundStateRef = undefined;
    this.handlerId = undefined;
    this._blockId = undefined;
  }

  /**
   * Resets all cue states to not triggered.
   * Useful when a timer is reset or restarted.
   */
  reset(): void {
    if (!this.soundStateRef) {
      return;
    }

    const state = this.soundStateRef.get();
    if (!state) {
      return;
    }

    this.soundStateRef.set({
      ...state,
      cues: state.cues.map(cue => ({
        ...cue,
        triggered: false,
        triggeredAt: undefined
      }))
    });
  }

  /**
   * Gets the current state of a specific cue.
   */
  getCueState(cueId: string): SoundCueState | undefined {
    if (!this.soundStateRef) {
      return undefined;
    }

    const state = this.soundStateRef.get();
    if (!state) {
      return undefined;
    }

    return state.cues.find(c => c.cueId === cueId);
  }

  /**
   * Gets all cue states.
   */
  getAllCueStates(): SoundCueState[] {
    if (!this.soundStateRef) {
      return [];
    }

    const state = this.soundStateRef.get();
    return state?.cues ?? [];
  }

  /**
   * Gets the configuration for this behavior.
   */
  getConfig(): SoundBehaviorConfig {
    return { ...this.config };
  }
}
