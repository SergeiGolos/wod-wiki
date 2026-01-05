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
import { BoundTimerBehavior } from "../../behaviors/BoundTimerBehavior";
import { ChildIndexBehavior } from "../../behaviors/ChildIndexBehavior";
import { RoundPerLoopBehavior } from "../../behaviors/RoundPerLoopBehavior";
import { UnboundLoopBehavior } from "../../behaviors/UnboundLoopBehavior";
import { ChildRunnerBehavior } from "../../behaviors/ChildRunnerBehavior";
import { SoundBehavior } from "../../behaviors/SoundBehavior";
import { createCountdownSoundCues } from "./TimerStrategy";
import { createSpanMetadata } from "../../utils/metadata";
import { PassthroughFragmentDistributor } from "../../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../../behaviors/ActionLayerBehavior";
import { RoundSpanBehavior } from "../../behaviors/RoundSpanBehavior";
import { LapTimerBehavior } from "../../behaviors/LapTimerBehavior";

/**
 * Strategy that creates parent blocks for AMRAP (As Many Rounds As Possible).
 */
export class TimeBoundRoundsStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        const statement = statements[0];
        const hasTimer = statement.hasFragment(FragmentType.Timer);
        const hasRounds = statement.hasFragment(FragmentType.Rounds);
        return hasTimer && hasRounds;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(code[0]?.fragments || [], "AMRAP");

        const timerFragment = code[0]?.findFragment<TimerFragment>(FragmentType.Timer);
        const durationMs = timerFragment?.value || 0;

        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const context = new BlockContext(runtime, blockId, getExerciseId(code[0]));

        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new ActionLayerBehavior(blockId, fragmentGroups, code[0]?.id ? [code[0].id] : []));

        // 1. Timer Behavior (Up for AMRAP)
        const timerBehavior = new BoundTimerBehavior(durationMs, 'up', 'AMRAP');
        behaviors.push(timerBehavior);

        // 2. Loop Behaviors
        const children = code[0]?.children || [];
        behaviors.push(new ChildIndexBehavior(children.length));
        behaviors.push(new ChildRunnerBehavior(children));
        behaviors.push(new RoundPerLoopBehavior());
        behaviors.push(new UnboundLoopBehavior());

        // 3. History Behavior
        behaviors.push(new HistoryBehavior({
            label: "AMRAP",
            debugMetadata: createSpanMetadata(
                ['amrap', 'time-bound'],
                {
                    strategyUsed: 'TimeBoundRoundsStrategy',
                    durationMs
                }
            )
        }));

        // 4. Sound Behavior
        if (durationMs > 0) {
            behaviors.push(new SoundBehavior({
                direction: 'up',
                durationMs,
                cues: createCountdownSoundCues(durationMs)
            }));
        }

        // 5. Completion
        behaviors.push(new CompletionBehavior(
            (_block, now) => timerBehavior.isComplete(now),
            ['timer:tick', 'timer:complete']
        ));

        // 6. Round Tracking (decomposed from LoopCoordinatorBehavior)
        // Note: No RoundDisplayBehavior for AMRAP since total rounds is unknown
        behaviors.push(new RoundSpanBehavior('rounds'));
        behaviors.push(new LapTimerBehavior());

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "AMRAP",
            `AMRAP ${durationMs / 60000} min`,
            fragmentGroups
        );
    }
}

function getExerciseId(statement: ICodeStatement): string {
    const stmt = statement as ICodeStatement & { exerciseId?: string };
    return stmt.exerciseId ?? '';
}
