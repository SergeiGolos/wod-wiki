import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../../../behaviors/ActionLayerBehavior";
import { HistoryBehavior } from "../../../behaviors/HistoryBehavior";
import { createSpanMetadata } from "../../../utils/metadata";
import { BoundTimerBehavior } from "../../../behaviors/BoundTimerBehavior";
import { BoundLoopBehavior } from "../../../behaviors/BoundLoopBehavior";
import { UnboundLoopBehavior } from "../../../behaviors/UnboundLoopBehavior";

export class GenericGroupStrategy implements IRuntimeBlockStrategy {
    priority = 40; // Lower than GenericTimer/GenericLoop (50) to let them define identity first

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return statements && statements.length > 0 && statements[0].children && statements[0].children.length > 0;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // If we have Timer or Loop behaviors, the identity is already set (Timer/Rounds/AMRAP/EMOM).
        if (builder.hasBehavior(BoundTimerBehavior) ||
            builder.hasBehavior(BoundLoopBehavior) ||
            builder.hasBehavior(UnboundLoopBehavior)) {
            return;
        }

        // If we are here, it has children but no timer/loop. It is a simple Group.
        const statement = statements[0];
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), statement.exerciseId || '');

        builder.setContext(context)
               .setKey(blockKey)
               .setBlockType("Group")
               .setLabel(statement.content || "Group")
               .setSourceIds(statement.id ? [statement.id] : []);

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(statement.fragments || [], "Group");
        builder.setFragments(fragmentGroups);
        builder.addBehaviorIfMissing(new ActionLayerBehavior(blockKey.toString(), fragmentGroups, statement.id ? [statement.id] : []));


        // History for Group
        builder.addBehavior(new HistoryBehavior({
            label: statement.content || "Group",
            debugMetadata: createSpanMetadata(
                ['group'],
                { strategyUsed: 'GenericGroupStrategy' }
            )
        }));
    }
}
