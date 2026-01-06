import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { BoundTimerBehavior } from "../../../behaviors/BoundTimerBehavior";
import { BoundLoopBehavior } from "../../../behaviors/BoundLoopBehavior";
import { IntervalWaitingBehavior } from "../../../behaviors/IntervalWaitingBehavior";
import { IntervalTimerRestartBehavior } from "../../../behaviors/IntervalTimerRestartBehavior";
import { TimerFragment } from "../../fragments/TimerFragment";
import { RoundsFragment } from "../../fragments/RoundsFragment";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { createSpanMetadata } from "../../../utils/metadata";
import { HistoryBehavior } from "../../../behaviors/HistoryBehavior";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../../../behaviors/ActionLayerBehavior";

export class IntervalLogicStrategy implements IRuntimeBlockStrategy {
    priority = 90;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        const statement = statements[0];
        const fragments = statement.fragments;
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const isInterval = statement.hints?.has('behavior.repeating_interval') ?? false;

        // EMOM can be parsed as 'Action' OR 'Effort' depending on parser version.
        // The debug test showed it as fragmentType: 'effort' for '1:00 EMOM 10'
        const hasEmomAction = fragments.some(
            f => (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort)
              && typeof f.value === 'string'
              && f.value.toLowerCase() === 'emom'
        );
        return hasTimer && (isInterval || hasEmomAction);
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        const statement = statements[0];
        const timerFragment = statement.findFragment<TimerFragment>(FragmentType.Timer);
        const intervalDurationMs = (timerFragment?.value as number) || 60000;

        const roundsFragment = statement.findFragment<RoundsFragment>(FragmentType.Rounds);
        let totalRounds = roundsFragment?.value as number | undefined;

        if (totalRounds === undefined) {
             // Try to find Reps if Rounds are missing (parser might classify '10' as Reps)
             const repFragment = statement.findFragment(FragmentType.Rep);
             if (repFragment && typeof repFragment.value === 'number') {
                 totalRounds = repFragment.value;
             }

            if (totalRounds === undefined) {
                const timers = statement.filterFragments<TimerFragment>(FragmentType.Timer) || [];
                if (timers.length > 1) {
                    // Heuristic: If there's a second timer, it might be total duration
                    const totalDurationMs = timers[1].value as number;
                    totalRounds = Math.floor(totalDurationMs / intervalDurationMs);
                }
            }
        }
        totalRounds = totalRounds || 10; // Default to 10 rounds if not specified

        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), statement.exerciseId || '');

        builder.setContext(context)
               .setKey(blockKey)
               .setBlockType("Interval")
               .setLabel("EMOM")
               .setSourceIds(statement.id ? [statement.id] : []);

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(statement.fragments || [], "Interval");
        builder.setFragments(fragmentGroups);

        builder.addBehaviorIfMissing(new ActionLayerBehavior(blockKey.toString(), fragmentGroups, statement.id ? [statement.id] : []));


        // 1. Timer (Interval is 'Down' bound timer)
        const timerBehavior = new BoundTimerBehavior(intervalDurationMs, 'down', 'Interval');
        builder.addBehavior(timerBehavior);

        // 2. Waiting Logic
        builder.addBehavior(new IntervalWaitingBehavior());

        // 3. Loop Logic
        // Note: RoundPerLoopBehavior is added by ChildrenStrategy to ensure proper ordering
        // (ChildIndexBehavior must come before RoundPerLoopBehavior)
        builder.addBehavior(new BoundLoopBehavior(totalRounds));
        builder.addBehavior(new IntervalTimerRestartBehavior());

        // 4. History
        builder.addBehavior(new HistoryBehavior({
            label: "EMOM",
            debugMetadata: createSpanMetadata(
                ['emom', 'interval', 'fixed_rounds'],
                {
                    strategyUsed: 'IntervalLogicStrategy',
                    intervalDuration: intervalDurationMs,
                    totalRounds
                }
            )
        }));
    }
}
