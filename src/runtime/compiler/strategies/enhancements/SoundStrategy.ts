import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";

// New aspect-based behaviors
import {
    SoundCueBehavior,
    TimerInitBehavior
} from "../../../behaviors";
import { TimerState } from "../../../memory/MemoryTypes";

/**
 * SoundStrategy adds sound cues to timer-based blocks.
 * 
 * Uses aspect-based behaviors:
 * - Output: SoundCueBehavior
 * 
 * This is a low-priority enhancement that adds sound cues
 * if not already added by a higher-priority strategy.
 */
export class SoundStrategy implements IRuntimeBlockStrategy {
    priority = 20;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return statements && statements.length > 0;
    }

    apply(builder: BlockBuilder, _statements: ICodeStatement[], _runtime: IScriptRuntime): void {
        // Skip if sound already added by Logic strategy
        if (builder.hasBehavior(SoundCueBehavior)) {
            return;
        }

        // Check if we have a timer behavior to determine sound cues
        const timerBehavior = builder.getBehavior(TimerInitBehavior);

        if (timerBehavior) {
            // Access the config from TimerInitBehavior
            const config = (timerBehavior as any).config as { direction: TimerState['direction']; durationMs?: number } | undefined;
            const direction = config?.direction ?? 'up';
            const durationMs = config?.durationMs;

            if (direction === 'down' && durationMs && durationMs > 0) {
                // Countdown timer - add countdown beeps
                builder.addBehavior(new SoundCueBehavior({
                    cues: [
                        { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
                        { sound: 'timer-complete', trigger: 'complete' }
                    ]
                }));
            } else if (direction === 'up') {
                // Countup timer - add milestone sounds
                builder.addBehavior(new SoundCueBehavior({
                    cues: [
                        { sound: 'start-beep', trigger: 'mount' }
                    ]
                }));
            }
        }
    }
}
