import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";

// New aspect-based behaviors
import {
    SoundCueBehavior,
    CountdownTimerBehavior,
    CountupTimerBehavior
} from "../../../behaviors";

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

        // Countdown timer: add 3-2-1 beeps and completion cue
        const countdown = builder.getBehavior(CountdownTimerBehavior);
        if (countdown) {
            builder.addBehavior(new SoundCueBehavior({
                cues: [
                    { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
                    { sound: 'timer-complete', trigger: 'complete' }
                ]
            }));
            return;
        }

        // Countup timer: start beep only
        if (builder.hasBehavior(CountupTimerBehavior)) {
            builder.addBehavior(new SoundCueBehavior({
                cues: [
                    { sound: 'start-beep', trigger: 'mount' }
                ]
            }));
        }
    }
}
