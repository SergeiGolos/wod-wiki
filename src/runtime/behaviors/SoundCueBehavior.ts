import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';
import { SoundFragment } from '../compiler/fragments/SoundFragment';
import type { SoundTrigger } from '../compiler/fragments/SoundFragment';

export interface SoundCue {
    /** Sound identifier or URL */
    sound: string;
    /** When to play: 'mount' | 'unmount' | 'countdown' | 'complete' */
    trigger: SoundTrigger;
    /** Countdown seconds (only for trigger: 'countdown') */
    atSeconds?: number[];
}

export interface SoundCueConfig {
    /** Sound cues to play */
    cues: SoundCue[];
}

/**
 * SoundCueBehavior emits sound cue outputs at specific lifecycle points.
 * 
 * ## Aspect: Output (Audio)
 * 
 * Emits 'system' outputs with SoundFragment that audio systems can observe.
 * Sound outputs are tracked as system events so they do not appear in the
 * user-facing review/logs page — only in the debug view.
 * This follows the principle that behaviors emit outputs, not events.
 * 
 * ## Output Contract
 * 
 * - **Mount**: Emits system output for 'mount' trigger sounds
 * - **Tick**: Emits system output for 'countdown' trigger sounds at specified seconds
 * - **Unmount**: Emits system output for 'unmount' and 'complete' trigger sounds
 * 
 * ## Audio System Integration
 * 
 * Audio systems should subscribe to outputs (via runtime output stream) and
 * filter for SoundFragment to play audio cues:
 * 
 * ```typescript
 * runtime.outputs$.subscribe(output => {
 *   const soundFragments = output.fragments.filter(f => f.fragmentType === FragmentType.Sound);
 *   for (const sf of soundFragments) {
 *     audioPlayer.play(sf.value.sound);
 *   }
 * });
 * ```
 */
export class SoundCueBehavior implements IRuntimeBehavior {
    constructor(private config: SoundCueConfig) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Emit mount sound outputs as system events (not shown in review logs)
        for (const cue of this.config.cues) {
            if (cue.trigger === 'mount') {
                ctx.emitOutput('system', [
                    new SoundFragment(cue.sound, 'mount')
                ], { label: `Sound: ${cue.sound}` });
            }
        }

        // Subscribe to timer tick for countdown sounds
        // Use 'bubble' scope so countdown cues play even when child blocks are active
        const countdownCues = this.config.cues.filter(c => c.trigger === 'countdown');
        if (countdownCues.length > 0) {
            const playedSeconds = new Set<number>();

            ctx.subscribe('tick', (_event, tickCtx) => {
                const timer = tickCtx.getMemory('time') as TimerState | undefined;
                if (!timer || timer.direction !== 'down' || !timer.durationMs) return [];

                // Calculate remaining seconds using TimeSpan properties
                const now = tickCtx.clock.now.getTime();
                let elapsed = 0;
                for (const span of timer.spans) {
                    const end = span.ended ?? now;
                    elapsed += end - span.started;
                }
                const remainingMs = timer.durationMs - elapsed;
                const remainingSeconds = Math.ceil(remainingMs / 1000);

                // Check if we should emit a sound cue
                for (const cue of countdownCues) {
                    if (cue.atSeconds?.includes(remainingSeconds) && !playedSeconds.has(remainingSeconds)) {
                        playedSeconds.add(remainingSeconds);
                        tickCtx.emitOutput('system', [
                            new SoundFragment(cue.sound, 'countdown', { atSecond: remainingSeconds })
                        ], { label: `Countdown: ${remainingSeconds}s` });
                    }
                }

                return [];
            }, { scope: 'bubble' });
        }

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Emit unmount/complete sound outputs as system events (not shown in review logs)
        for (const cue of this.config.cues) {
            if (cue.trigger === 'unmount' || cue.trigger === 'complete') {
                ctx.emitOutput('system', [
                    new SoundFragment(cue.sound, cue.trigger)
                ], { label: `Sound: ${cue.sound}` });
            }
        }

        return [];
    }

    onDispose(_ctx: IBehaviorContext): void {
        // No cleanup needed
    }
}
