import { IRuntimeBlockStrategy } from "../../contracts/IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "../../contracts/IRuntimeBehavior";
import { IRuntimeBlock } from "../../contracts/IRuntimeBlock";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { BlockKey } from "../../../core/models/BlockKey";
import { ICodeStatement } from "../../../core/models/CodeStatement";
import { RuntimeBlock } from "../../RuntimeBlock";
import { FragmentType } from "../../../core/models/CodeFragment";
import { BlockContext } from "../../BlockContext";
import { HistoryBehavior } from "../../behaviors/HistoryBehavior";
import { BoundTimerBehavior } from "../../behaviors/BoundTimerBehavior";
import { SoundBehavior } from "../../behaviors/SoundBehavior";
import { createCountdownSoundCues } from "./TimerStrategy";
import { ChildIndexBehavior } from "../../behaviors/ChildIndexBehavior";
import { ChildRunnerBehavior } from "../../behaviors/ChildRunnerBehavior";
import { RoundPerNextBehavior } from "../../behaviors/RoundPerNextBehavior";
import { BoundLoopBehavior } from "../../behaviors/BoundLoopBehavior";
import { IntervalWaitingBehavior } from "../../behaviors/IntervalWaitingBehavior";
import { createSpanMetadata } from "../../utils/metadata";
import { PassthroughFragmentDistributor } from "../../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../../behaviors/ActionLayerBehavior";
import { TimerFragment } from "../fragments/TimerFragment";
import { RoundsFragment } from "../fragments/RoundsFragment";

/**
 * Strategy that creates interval-based parent blocks for EMOM workouts.
 */
export class IntervalStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        const statement = statements[0];
        const fragments = statement.fragments;
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const isInterval = statement.hints?.has('behavior.repeating_interval') ?? false;
        const hasEmomAction = fragments.some(
            f => f.fragmentType === FragmentType.Action && typeof f.value === 'string' && f.value.toLowerCase() === 'emom'
        );
        return hasTimer && (isInterval || hasEmomAction);
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(code[0]?.fragments || [], "Interval");

        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = getExerciseId(code[0]);
        const context = new BlockContext(runtime, blockId, exerciseId);

        const timerFragment = code[0]?.findFragment<TimerFragment>(FragmentType.Timer);
        const intervalDurationMs = (timerFragment?.value as number) || 60000;

        const roundsFragment = code[0]?.findFragment<RoundsFragment>(FragmentType.Rounds);
        let totalRounds = roundsFragment?.value as number | undefined;

        if (totalRounds === undefined) {
            const timers = code[0]?.filterFragments<TimerFragment>(FragmentType.Timer) || [];
            if (timers.length > 1) {
                const totalDurationMs = timers[1].value as number;
                totalRounds = Math.floor(totalDurationMs / intervalDurationMs);
            }
        }
        totalRounds = totalRounds || 10;

        const children = code[0]?.children || [];

        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new ActionLayerBehavior(blockId, fragmentGroups, code[0]?.id ? [code[0].id] : []));

        // 1. Timer
        const timerBehavior = new BoundTimerBehavior(intervalDurationMs, 'down', 'Interval');
        behaviors.push(timerBehavior);

        // 2. Waiting
        behaviors.push(new IntervalWaitingBehavior());

        // 3. Loop
        behaviors.push(new RoundPerNextBehavior());
        behaviors.push(new BoundLoopBehavior(totalRounds));

        // 4. Children
        behaviors.push(new ChildIndexBehavior(children.length));
        behaviors.push(new ChildRunnerBehavior(children));

        // 5. History
        behaviors.push(new HistoryBehavior({
            label: "EMOM",
            debugMetadata: createSpanMetadata(
                ['emom', 'interval', 'fixed_rounds'],
                {
                    strategyUsed: 'IntervalStrategy',
                    intervalDuration: intervalDurationMs,
                    totalRounds
                }
            )
        }));

        // 6. Sound
        behaviors.push(new SoundBehavior({
            direction: 'down',
            durationMs: intervalDurationMs,
            cues: createCountdownSoundCues(intervalDurationMs)
        }));

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Interval",
            "EMOM",
            fragmentGroups
        );
    }
}

function getExerciseId(statement: ICodeStatement): string {
    const stmt = statement as ICodeStatement & { exerciseId?: string };
    return stmt.exerciseId ?? '';
}
