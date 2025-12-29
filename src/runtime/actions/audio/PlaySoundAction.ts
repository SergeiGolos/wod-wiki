import { IScriptRuntime } from '../../contracts/IScriptRuntime';
import { ActionPhase, IPhasedAction } from '../ActionPhase';

/**
 * Action for playing sounds during workout execution.
 * 
 * This action emits a 'sound:play' event that can be consumed by UI components
 * to trigger audio playback. The runtime itself does not handle audio playback
 * directly - it delegates to registered sound handlers.
 * 
 * This action is in the SIDE_EFFECT phase, executing after display and memory
 * updates but before events and stack mutations.
 * 
 * @example
 * ```typescript
 * // Play a predefined beep sound
 * return [new PlaySoundAction('beep')];
 * 
 * // Play a sound at 50% volume
 * return [new PlaySoundAction('buzzer', 0.5)];
 * 
 * // Play a custom sound URL
 * return [new PlaySoundAction('https://example.com/sound.mp3')];
 * ```
 */
export class PlaySoundAction implements IPhasedAction {
  readonly type = 'play-sound';
  readonly phase = ActionPhase.SIDE_EFFECT;
  
  constructor(
    /** 
     * Sound identifier. Can be:
     * - Predefined sound name: 'beep', 'buzzer', 'chime', 'tick'
     * - URL to audio file
     */
    public readonly sound: string,
    /** Volume level (0.0 to 1.0). Default is 1.0 */
    public readonly volume: number = 1.0,
    /** Optional cue ID for tracking which cue triggered this sound */
    public readonly cueId?: string
  ) {
    // Validate volume range
    if (volume < 0 || volume > 1) {
      throw new RangeError(`Volume must be between 0.0 and 1.0, got: ${volume}`);
    }
  }

  /**
   * Executes the sound playback by emitting a 'sound:play' event.
   * UI components should register handlers for this event to play audio.
   */
  do(runtime: IScriptRuntime): void {
    runtime.handle({
      name: 'sound:play',
      timestamp: new Date(),
      data: {
        sound: this.sound,
        volume: this.volume,
        cueId: this.cueId
      }
    });
  }
}
