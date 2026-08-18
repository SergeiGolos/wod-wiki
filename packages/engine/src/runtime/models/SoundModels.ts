/**
 * Sound-related type definitions for the runtime.
 */

/**
 * Configuration for a single sound cue.
 * Sound cues are triggered when a timer reaches a specific threshold.
 */
export interface SoundCue {
  /** Unique identifier for this cue */
  id: string;
  
  /** 
   * Time threshold in milliseconds when this cue should trigger.
   * For countdown timers: triggers when remainingMs <= threshold
   * For count-up timers: triggers when elapsedMs >= threshold
   */
  threshold: number;
  
  /** 
   * Sound to play. Can be:
   * - Predefined sound name: 'beep', 'buzzer', 'chime', 'tick'
   * - URL to audio file
   */
  sound: string;
  
  /** Volume level (0.0 to 1.0). Default is 1.0 */
  volume?: number;
}

/**
 * State tracking for a single sound cue.
 * Used to prevent duplicate triggers.
 */
export interface SoundCueState {
  /** Reference to the cue configuration ID */
  cueId: string;
  
  /** Whether this cue has been triggered */
  triggered: boolean;
  
  /** Timestamp when the cue was triggered (ms since epoch) */
  triggeredAt?: number;
}

/**
 * Configuration for SoundBehavior.
 */
export interface SoundBehaviorConfig {
  /** Direction of the timer ('up' for count-up, 'down' for countdown) */
  direction: 'up' | 'down';
  
  /** Total duration for countdown timers (required for 'down' direction) */
  durationMs?: number;
  
  /** Array of sound cues to trigger at specific time thresholds */
  cues: SoundCue[];
}

/**
 * Runtime state for sound behavior stored in memory.
 */
export interface SoundState {
  /** Block ID that owns this sound state */
  blockId: string;
  
  /** State of each configured cue */
  cues: SoundCueState[];
}

/**
 * Predefined sound names that can be used in SoundCue.sound
 */
export const PREDEFINED_SOUNDS = {
  /** Short single beep - good for countdown ticks */
  BEEP: 'beep',
  
  /** Long buzz - good for timer completion */
  BUZZER: 'buzzer',
  
  /** Pleasant chime - good for milestones */
  CHIME: 'chime',
  
  /** Clock tick - good for second-by-second countdown */
  TICK: 'tick',
  
  /** Ascending sequence - good for timer start */
  START: 'start',
} as const;

export type PredefinedSoundName = typeof PREDEFINED_SOUNDS[keyof typeof PREDEFINED_SOUNDS];
