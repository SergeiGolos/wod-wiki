import { IRuntimeBlockStrategy } from "../../contracts/IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "../../contracts/IRuntimeBehavior";
import { IRuntimeBlock } from "../../contracts/IRuntimeBlock";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { BlockKey } from "../../../core/models/BlockKey";
import { ICodeStatement } from "../../../core/models/CodeStatement";
import { RuntimeBlock } from "../../RuntimeBlock";
import { BlockContext } from "../../BlockContext";
import { ChildIndexBehavior } from "../../behaviors/ChildIndexBehavior";
import { ChildRunnerBehavior } from "../../behaviors/ChildRunnerBehavior";
import { RoundPerLoopBehavior } from "../../behaviors/RoundPerLoopBehavior";
import { SinglePassBehavior } from "../../behaviors/SinglePassBehavior";
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
 * Strategy that creates group blocks for nested/grouped exercises.
 */
export class GroupStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        const statement = statements[0];
        const isGroup = statement.hints?.has('behavior.group') ?? false;
        const hasChildren = (statement.children && statement.children.length > 0) || false;
        return isGroup || hasChildren;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(code[0]?.fragments ?? [], "Group");

        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = getExerciseId(code[0]);
        const context = new BlockContext(runtime, blockId, exerciseId);

        const children = code[0]?.children || [];
        const behaviors: IRuntimeBehavior[] = [];

        behaviors.push(new ActionLayerBehavior(blockId, fragmentGroups, code[0]?.id ? [code[0].id] : []));

        if (children.length > 0) {
            behaviors.push(new ChildIndexBehavior(children.length));
            behaviors.push(new ChildRunnerBehavior(children));
            behaviors.push(new RoundPerLoopBehavior());
            behaviors.push(new SinglePassBehavior());
        } else {
            // Emptry group completes immediately
            behaviors.push(new SinglePassBehavior());
        }

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Group",
            "Group",
            fragmentGroups
        );
    }
}
