import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";

// New aspect-based behaviors
// TimerInitBehavior and RoundInitBehavior are imported for type-checking purposes only
// to detect if higher-priority strategies have already set the block identity
import {
    TimerInitBehavior,
    RoundInitBehavior,
    DisplayInitBehavior,
    HistoryRecordBehavior
} from "../../../behaviors";

/**
 * GenericGroupStrategy handles blocks with children but no timer/loop.
 * 
 * Uses aspect-based behaviors:
 * - Display: DisplayInit
 * - Output: HistoryRecord
 */
export class GenericGroupStrategy implements IRuntimeBlockStrategy {
    priority = 50; // Same as GenericTimer/GenericLoop; runs before ChildrenStrategy (same priority, registered earlier)

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return statements && statements.length > 0 && statements[0].children && statements[0].children.length > 0;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // If we have Timer or Loop behaviors, the identity is already set (Timer/Rounds/AMRAP/EMOM).
        if (builder.hasBehavior(TimerInitBehavior) ||
            builder.hasBehavior(RoundInitBehavior)) {
            return;
        }

        // If we are here, it has children but no timer/loop. It is a simple Group.
        const statement = statements[0];
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), statement.exerciseId || '');
        const label = statement.content || "Group";

        builder.setContext(context)
               .setKey(blockKey)
               .setBlockType("Group")
               .setLabel(label)
               .setSourceIds(statement.id ? [statement.id] : []);

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(statement.fragments || [], "Group");
        builder.setFragments(fragmentGroups);

        // =====================================================================
        // Display Aspect
        // =====================================================================
        builder.addBehavior(new DisplayInitBehavior({
            mode: 'clock',
            label
        }));

        // =====================================================================
        // Output Aspect
        // =====================================================================
        builder.addBehavior(new HistoryRecordBehavior());
    }
}
