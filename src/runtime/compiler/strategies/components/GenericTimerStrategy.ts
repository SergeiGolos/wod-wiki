import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType, FragmentCollectionState } from "@/core/models/CodeFragment";
import { TimerFragment } from "../../fragments/TimerFragment";
import { BoundTimerBehavior } from "../../../behaviors/BoundTimerBehavior";
import { UnboundTimerBehavior } from "../../../behaviors/UnboundTimerBehavior";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { CompletionBehavior } from "../../../behaviors/CompletionBehavior";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../../../behaviors/ActionLayerBehavior";

export class GenericTimerStrategy implements IRuntimeBlockStrategy {
    priority = 50; // Mid priority

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;

        // Match if timer fragment exists, ignoring runtime-generated ones (e.g. artifacts from previous execution)
        return statements[0].findFragment(FragmentType.Timer, f => f.collectionState !== FragmentCollectionState.RuntimeGenerated) !== undefined;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        if (builder.hasBehavior(BoundTimerBehavior) || builder.hasBehavior(UnboundTimerBehavior)) {
            return;
        }

        const statement = statements[0];
        const timerFragment = statement.findFragment<TimerFragment>(FragmentType.Timer, f => f.collectionState !== FragmentCollectionState.RuntimeGenerated);
        const direction = timerFragment?.direction || 'up';
        const durationMs = timerFragment?.value || undefined;
        const label = direction === 'down' ? 'Countdown' : 'For Time';

        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), statement.exerciseId || '');

        builder.setContext(context)
               .setKey(blockKey)
               .setBlockType("Timer")
               .setLabel(label)
               .setSourceIds(statement.id ? [statement.id] : []);

        // Filter out runtime-generated fragments to avoid pollution
        const cleanFragments = (statement.fragments || []).filter(f => f.collectionState !== FragmentCollectionState.RuntimeGenerated);

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(cleanFragments, "Timer");
        builder.setFragments(fragmentGroups);
        builder.addBehaviorIfMissing(new ActionLayerBehavior(blockKey.toString(), fragmentGroups, statement.id ? [statement.id] : []));


        let timerBehavior: any;
        if (durationMs) {
            timerBehavior = new BoundTimerBehavior(durationMs, direction, label);
        } else {
            timerBehavior = new UnboundTimerBehavior(label);
        }
        builder.addBehavior(timerBehavior);

        if (durationMs) {
             builder.addBehavior(new CompletionBehavior(
                (_block, now) => timerBehavior.isComplete(now),
                ['timer:tick', 'timer:complete']
            ));
        }
    }
}
