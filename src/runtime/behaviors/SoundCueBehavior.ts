import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { TimerState } from '../memory/MemoryTypes';

export interface SoundCue {
    /** Sound identifier or URL */
    sound: string;
    /** When to play: 'mount' | 'unmount' | 'countdown' | 'complete' */
    trigger: 'mount' | 'unmount' | 'countdown' | 'complete';
    /** Countdown seconds (only for trigger: 'countdown') */
    atSeconds?: number[];
}

export interface SoundCueConfig {
    /** Sound cues to play */
    cues: SoundCue[];
}

/**
 * SoundCueBehavior plays audio cues at specific lifecycle points.
 * 
 * ## Aspect: Output (Audio)
 * 
 * Emits sound events that the audio system can respond to.
 */
export class SoundCueBehavior implements IRuntimeBehavior {
    constructor(private config: SoundCueConfig) { }

    onMount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Play mount sounds
        for (const cue of this.config.cues) {
            if (cue.trigger === 'mount') {
                ctx.emitEvent({
                    name: 'sound:play',
                    timestamp: ctx.clock.now,
                    data: {
                        sound: cue.sound,
                        blockKey: ctx.block.key.toString()
                    }
                });
            }
        }

        // Subscribe to timer tick for countdown sounds
        const countdownCues = this.config.cues.filter(c => c.trigger === 'countdown');
        if (countdownCues.length > 0) {
            const playedSeconds = new Set<number>();

            ctx.subscribe('tick', (_event, tickCtx) => {
                const timer = tickCtx.getMemory('timer') as TimerState | undefined;
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

                // Check if we should play a cue
                for (const cue of countdownCues) {
                    if (cue.atSeconds?.includes(remainingSeconds) && !playedSeconds.has(remainingSeconds)) {
                        playedSeconds.add(remainingSeconds);
                        tickCtx.emitEvent({
                            name: 'sound:play',
                            timestamp: tickCtx.clock.now,
                            data: {
                                sound: cue.sound,
                                remainingSeconds,
                                blockKey: tickCtx.block.key.toString()
                            }
                        });
                    }
                }

                return [];
            });
        }

        return [];
    }

    onNext(_ctx: IBehaviorContext): IRuntimeAction[] {
        return [];
    }

    onUnmount(ctx: IBehaviorContext): IRuntimeAction[] {
        // Play unmount sounds
        for (const cue of this.config.cues) {
            if (cue.trigger === 'unmount' || cue.trigger === 'complete') {
                ctx.emitEvent({
                    name: 'sound:play',
                    timestamp: ctx.clock.now,
                    data: {
                        sound: cue.sound,
                        blockKey: ctx.block.key.toString()
                    }
                });
            }
        }

        return [];
    }
}
