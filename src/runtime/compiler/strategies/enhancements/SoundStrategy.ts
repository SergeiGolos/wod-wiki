import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { BoundTimerBehavior } from "../../../behaviors/BoundTimerBehavior";
import { SoundBehavior } from "../../../behaviors/SoundBehavior";
import { createCountdownSoundCues, createCountUpSoundCues } from "../TimerStrategy";

export class SoundStrategy implements IRuntimeBlockStrategy {
    priority = 20;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return statements && statements.length > 0;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        if (builder.hasBehavior(SoundBehavior)) {
            return;
        }

        const timerBehavior = builder.getBehavior(BoundTimerBehavior);

        if (timerBehavior) {
            const { direction, durationMs } = timerBehavior;

            if (direction === 'down' && durationMs && durationMs > 0) {
                builder.addBehavior(new SoundBehavior({
                    direction: 'down',
                    durationMs,
                    cues: createCountdownSoundCues(durationMs)
                }));
            } else if (direction === 'up') {
                builder.addBehavior(new SoundBehavior({
                    direction: 'up',
                    cues: createCountUpSoundCues()
                }));
            }
        }
    }
}
