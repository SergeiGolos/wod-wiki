import { SoundCue, PREDEFINED_SOUNDS } from '../models/SoundModels';

/**
 * Creates default countdown sound cues for a timer with specified duration.
 * Includes: 3-2-1 tick countdown and final buzzer.
 */
export function createCountdownSoundCues(durationMs: number): SoundCue[] {
    const cues: SoundCue[] = [];
    if (durationMs >= 3000) cues.push({ id: '3-sec', threshold: 3000, sound: PREDEFINED_SOUNDS.TICK, volume: 0.7 });
    if (durationMs >= 2000) cues.push({ id: '2-sec', threshold: 2000, sound: PREDEFINED_SOUNDS.TICK, volume: 0.7 });
    if (durationMs >= 1000) cues.push({ id: '1-sec', threshold: 1000, sound: PREDEFINED_SOUNDS.TICK, volume: 0.7 });
    cues.push({ id: 'complete', threshold: 0, sound: PREDEFINED_SOUNDS.BUZZER, volume: 1.0 });
    return cues;
}

/**
 * Creates default count-up sound cues for a timer.
 */
export function createCountUpSoundCues(): SoundCue[] {
    return [{ id: 'start', threshold: 0, sound: PREDEFINED_SOUNDS.START, volume: 1.0 }];
}
