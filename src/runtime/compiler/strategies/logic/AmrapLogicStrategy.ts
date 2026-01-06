import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { BoundTimerBehavior } from "../../../behaviors/BoundTimerBehavior";
import { UnboundLoopBehavior } from "../../../behaviors/UnboundLoopBehavior";
import { CompletionBehavior } from "../../../behaviors/CompletionBehavior";
import { TimerFragment } from "../../fragments/TimerFragment";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { createSpanMetadata } from "../../../utils/metadata";
import { HistoryBehavior } from "../../../behaviors/HistoryBehavior";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../../../behaviors/ActionLayerBehavior";

export class AmrapLogicStrategy implements IRuntimeBlockStrategy {
    priority = 90;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        const statement = statements[0];
        const hasTimer = statement.hasFragment(FragmentType.Timer);
        const hasRounds = statement.hasFragment(FragmentType.Rounds);
        return hasTimer && hasRounds;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        const statement = statements[0];
        const timerFragment = statement.findFragment<TimerFragment>(FragmentType.Timer);
        const durationMs = timerFragment?.value || 0;

        // 1. Basic Metadata
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), statement.exerciseId || '');

        // Only set if not already set (though Logic runs first, so it sets the tone)
        builder.setContext(context)
               .setKey(blockKey)
               .setBlockType("AMRAP")
               .setLabel(`AMRAP ${Math.round(durationMs / 60000)} min`)
               .setSourceIds(statement.id ? [statement.id] : []);

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(statement.fragments || [], "AMRAP");
        builder.setFragments(fragmentGroups);

        builder.addBehaviorIfMissing(new ActionLayerBehavior(blockKey.toString(), fragmentGroups, statement.id ? [statement.id] : []));


        // 2. Timer (AMRAP is always 'Up' bound timer)
        const timerBehavior = new BoundTimerBehavior(durationMs, 'up', 'AMRAP');
        builder.addBehavior(timerBehavior);

        // 3. Loop (Unbound - run until timer stops)
        // We add UnboundLoopBehavior which allows infinite rounds
        builder.addBehavior(new UnboundLoopBehavior());

        // 4. Completion Logic
        // Complete when timer is done
        builder.addBehavior(new CompletionBehavior(
            (_block, now) => timerBehavior.isComplete(now),
            ['timer:tick', 'timer:complete']
        ));

        // 5. History Hint
        // Logic knows best about what this is
        builder.addBehavior(new HistoryBehavior({
            label: "AMRAP",
            debugMetadata: createSpanMetadata(
                ['amrap', 'time-bound'],
                {
                    strategyUsed: 'AmrapLogicStrategy',
                    durationMs
                }
            )
        }));
    }
}
