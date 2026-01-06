import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { HistoryBehavior } from "../../../behaviors/HistoryBehavior";
import { createSpanMetadata } from "../../../utils/metadata";
import { ActionLayerBehavior } from "../../../behaviors/ActionLayerBehavior";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";
import { BoundLoopBehavior } from "../../../behaviors/BoundLoopBehavior";

export class EffortFallbackStrategy implements IRuntimeBlockStrategy {
    priority = 0;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        const statement = statements[0];
        const hasTimer = statement.hasFragment(FragmentType.Timer);
        const hasRounds = statement.hasFragment(FragmentType.Rounds);
        return !hasTimer && !hasRounds;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // If Loop behavior exists (e.g. from ChildrenStrategy?), we might not need Effort?
        if (builder.hasBehavior(BoundLoopBehavior) || builder.hasBehavior(ChildRunnerBehavior)) return;

        const statement = statements[0];
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), statement.exerciseId || '');

        builder.setContext(context)
               .setKey(blockKey)
               .setBlockType("Effort")
               .setLabel(statement.content || "Effort") // Use text content as label
               .setSourceIds(statement.id ? [statement.id] : []);

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(statement.fragments || [], "Effort");
        builder.setFragments(fragmentGroups);

        builder.addBehaviorIfMissing(new ActionLayerBehavior(blockKey.toString(), fragmentGroups, statement.id ? [statement.id] : []));


        // Effort block usually has History
        builder.addBehavior(new HistoryBehavior({
            label: statement.content || "Effort",
            debugMetadata: createSpanMetadata(
                ['effort'],
                { strategyUsed: 'EffortFallbackStrategy' }
            )
        }));
    }
}
