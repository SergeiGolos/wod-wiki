import { IRuntimeBlockStrategy } from "../../contracts/IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "../../contracts/IRuntimeBehavior";
import { IRuntimeBlock } from "../../contracts/IRuntimeBlock";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { BlockKey } from "../../../core/models/BlockKey";
import { ICodeStatement } from "../../../core/models/CodeStatement";
import { RuntimeBlock } from "../../RuntimeBlock";
import { FragmentType } from "../../../core/models/CodeFragment";
import { TimerFragment } from "../fragments/TimerFragment";
import { BlockContext } from "../../BlockContext";
import { CompletionBehavior } from "../../behaviors/CompletionBehavior";
import { HistoryBehavior } from "../../behaviors/HistoryBehavior";
import { SoundBehavior } from "../../behaviors/SoundBehavior";
import { PREDEFINED_SOUNDS, SoundCue } from "../../models/SoundModels";
import { BoundTimerBehavior } from "../../behaviors/BoundTimerBehavior";
import { UnboundTimerBehavior } from "../../behaviors/UnboundTimerBehavior";
import { ChildIndexBehavior } from "../../behaviors/ChildIndexBehavior";
import { RoundPerLoopBehavior } from "../../behaviors/RoundPerLoopBehavior";
import { SinglePassBehavior } from "../../behaviors/SinglePassBehavior";
import { ChildRunnerBehavior } from "../../behaviors/ChildRunnerBehavior";
import { createSpanMetadata } from "../../utils/metadata";
import { PassthroughFragmentDistributor } from "../../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../../behaviors/ActionLayerBehavior";

/**
 * Helper to extract optional exerciseId from code statement.
 */
function getExerciseId(statement: ICodeStatement): string {
    const stmt = statement as ICodeStatement & { exerciseId?: string };
    return stmt.exerciseId ?? '';
}

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

/**
 * Strategy that creates timer-based parent blocks for time-bound workouts.
 */
export class TimerStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        if (!statements[0].fragments) return false;
        const statement = statements[0];
        const hasTimer = statement.hasFragment(FragmentType.Timer);
        const isExplicitTimer = statement.hints?.has('behavior.timer') ?? false;
        return hasTimer || isExplicitTimer;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(code[0]?.fragments || [], "Timer");

        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = getExerciseId(code[0]);
        const context = new BlockContext(runtime, blockId, exerciseId);

        const timerFragment = code[0]?.findFragment<TimerFragment>(FragmentType.Timer);
        const direction = timerFragment?.direction || 'up';
        const durationMs = timerFragment?.value || undefined;
        const label = direction === 'down' ? 'Countdown' : 'For Time';

        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new ActionLayerBehavior(blockId, fragmentGroups, code[0]?.id ? [code[0].id] : []));

        // 1. Timer Behavior
        let timerBehavior: any;
        if (durationMs) {
            timerBehavior = new BoundTimerBehavior(durationMs, direction, label);
        } else {
            timerBehavior = new UnboundTimerBehavior(label);
        }
        behaviors.push(timerBehavior);

        // 2. History Behavior
        behaviors.push(new HistoryBehavior({
            label: "Timer",
            debugMetadata: createSpanMetadata(
                ['timer', direction === 'down' ? 'countdown' : 'count_up'],
                {
                    strategyUsed: 'TimerStrategy',
                    timerDirection: direction,
                    ...(durationMs && { timerDuration: durationMs })
                }
            )
        }));

        // 3. Sound Behavior
        if (direction === 'down' && durationMs && durationMs > 0) {
            behaviors.push(new SoundBehavior({
                direction: 'down',
                durationMs,
                cues: createCountdownSoundCues(durationMs)
            }));
        } else if (direction === 'up') {
            behaviors.push(new SoundBehavior({
                direction: 'up',
                cues: createCountUpSoundCues()
            }));
        }

        // 4. Children looping behaviors
        const children = code[0]?.children || [];
        if (children.length > 0) {
            behaviors.push(new ChildIndexBehavior(children.length));
            behaviors.push(new ChildRunnerBehavior(children));
            behaviors.push(new RoundPerLoopBehavior());
            behaviors.push(new SinglePassBehavior());
        }

        // 5. Completion
        if (durationMs) {
            behaviors.push(new CompletionBehavior(
                (_block, now) => timerBehavior.isComplete(now),
                ['timer:tick', 'timer:complete']
            ));
        }

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Timer",
            label,
            fragmentGroups
        );
    }
}
