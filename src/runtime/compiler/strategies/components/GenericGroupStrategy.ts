import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";
import { FragmentType } from "@/core/models/CodeFragment";

// New aspect-based behaviors
// TimerBehavior and ReEntryBehavior are imported for type-checking purposes only
// to detect if higher-priority strategies have already set the block identity
import {
    TimerBehavior,
    ReEntryBehavior,
    LabelingBehavior,
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
        if (!statements || statements.length === 0) return false;
        
        // Match if ANY statement has children but NO statement has timer/rounds
        const hasChildren = statements.some(s => s.children && s.children.length > 0);
        const hasTimer = statements.some(s => s.fragments.some(f => f.fragmentType === FragmentType.Duration && f.origin !== 'runtime'));
        const hasRounds = statements.some(s => s.fragments.some(f => f.fragmentType === FragmentType.Rounds && f.origin !== 'runtime'));
        
        return hasChildren && !hasTimer && !hasRounds;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // If we have Timer or Loop behaviors, the identity is already set (Timer/Rounds/AMRAP/EMOM).
        if (builder.hasBehavior(TimerBehavior) ||
            builder.hasBehavior(ReEntryBehavior)) {
            return;
        }

        // If we are here, it has children but no timer/loop. It is a simple Group.
        const firstStatement = statements[0];
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), firstStatement.exerciseId || '');
        
        const label = statements
            .map(s => s.content || "Group")
            .filter((val, index, self) => self.indexOf(val) === index) // Unique
            .join(" + ");

        builder.setContext(context)
               .setKey(blockKey)
               .setBlockType("Group")
               .setLabel(label)
               .setSourceIds(statements.map(s => s.id));

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = statements.flatMap(s => 
            distributor.distribute(s.fragments || [], "Group")
        ).filter(group => group.length > 0);
        
        builder.setFragments(fragmentGroups);

        // =====================================================================
        // Display Aspect
        // =====================================================================
        builder.addBehavior(new LabelingBehavior({
            mode: 'clock',
            label
        }));

        // =====================================================================
        // Output Aspect
        // =====================================================================
        builder.addBehavior(new HistoryRecordBehavior());
    }
}
