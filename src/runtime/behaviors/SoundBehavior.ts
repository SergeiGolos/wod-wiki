import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockLifecycleOptions, IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { TypedMemoryReference } from '../contracts/IMemoryReference';
import { PlaySoundAction } from '../actions/audio/PlaySoundAction';
import { IEvent } from '../contracts/events/IEvent';
import {
  SoundBehaviorConfig,
  SoundCue,
  SoundState,
  SoundCueState
} from '../models/SoundModels';

const SOUND_STATE_TYPE = 'sound-state';

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
 *
 * It listens for `timer:tick` events and checks if configured cues should trigger.
 * State is maintained in block context to ensure cues trigger only once per activation.
 */
export class SoundBehavior implements IRuntimeBehavior {
  private config: SoundBehaviorConfig;
  private soundStateRef?: TypedMemoryReference<SoundState>;
  private _blockId?: string;

  static readonly VALID_DIRECTIONS = ['up', 'down'] as const;

  constructor(config: SoundBehaviorConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  private validateConfig(config: SoundBehaviorConfig): void {
    if (!SoundBehavior.VALID_DIRECTIONS.includes(config.direction as typeof SoundBehavior.VALID_DIRECTIONS[number])) {
      throw new TypeError(`Invalid timer direction: ${config.direction}. Must be 'up' or 'down'.`);
    }

    if (config.direction === 'down' && config.durationMs === undefined) {
      throw new RangeError('Countdown timer must have durationMs');
    }

    if (!config.cues) {
      throw new TypeError('Sound cues array is required');
    }

    if (config.cues.length === 0) {
      // Allow empty cues, functionally a no-op behavior
    }

    for (const cue of config.cues) {
      if (!cue.id) {
        throw new TypeError('Each sound cue must have an id');
      }
      if (cue.threshold < 0) {
        throw new RangeError(`Cue threshold must be >= 0, got: ${cue.threshold}`);
      }
      if (!cue.sound) {
        throw new TypeError(`Cue ${cue.id} must have a sound`);
      }
      if (cue.volume !== undefined && (cue.volume < 0 || cue.volume > 1)) {
        throw new RangeError(`Cue ${cue.id} volume must be between 0.0 and 1.0`);
      }
    }
  }

  onPush(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
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
    this.soundStateRef = block.context.allocate<SoundState>(
      SOUND_STATE_TYPE,
      initialState,
      'private'
    );

    return [];
  }

  onNext(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    return [];
  }

  onPop(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
    return [];
  }

  onEvent(event: IEvent, block: IRuntimeBlock): IRuntimeAction[] {
    // Only process timer:tick events
    if (event.name !== 'timer:tick') {
      return [];
    }

    const data = event.data as {
      blockId?: string;
      elapsedMs?: number;
      remainingMs?: number;
      direction?: string;
    } | undefined;

    // Skip if this tick is not for our block
    if (!data || data.blockId !== this._blockId) {
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

  onDispose(block: IRuntimeBlock): void {
    this.soundStateRef = undefined;
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
