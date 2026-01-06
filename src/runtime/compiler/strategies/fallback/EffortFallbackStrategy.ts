import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType, FragmentCollectionState } from "@/core/models/CodeFragment";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { HistoryBehavior } from "../../../behaviors/HistoryBehavior";
import { createSpanMetadata } from "../../../utils/metadata";
import { ActionLayerBehavior } from "../../../behaviors/ActionLayerBehavior";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";
import { BoundLoopBehavior } from "../../../behaviors/BoundLoopBehavior";
import { ChildRunnerBehavior } from "../../../behaviors/ChildRunnerBehavior";

/**
 * Helper to extract optional exerciseId from code statement.
 */
function getExerciseId(statement: ICodeStatement): string {
    const stmt = statement as ICodeStatement & { exerciseId?: string };
    return stmt.exerciseId ?? '';
}

/**
 * Helper to extract optional content from code statement.
 */
function getContent(statement: ICodeStatement, defaultContent: string): string {
    const stmt = statement as ICodeStatement & { content?: string };
    if (stmt.content) return stmt.content;

    // Fallback: Construct content from fragments
    if (statement.fragments && statement.fragments.length > 0) {
        return statement.fragments
            .filter(f => f.collectionState !== FragmentCollectionState.RuntimeGenerated && f.image)
            .map(f => f.image)
            .join(' ');
    }

    return defaultContent;
}

export class EffortFallbackStrategy implements IRuntimeBlockStrategy {
    priority = 0;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        const statement = statements[0];
        // Ignore runtime-generated fragments when checking for match
        const hasTimer = statement.findFragment(FragmentType.Timer, f => f.collectionState !== FragmentCollectionState.RuntimeGenerated) !== undefined;
        const hasRounds = statement.findFragment(FragmentType.Rounds, f => f.collectionState !== FragmentCollectionState.RuntimeGenerated) !== undefined;
        return !hasTimer && !hasRounds;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // If Loop behavior exists (e.g. from ChildrenStrategy?), we might not need Effort?
        if (builder.hasBehavior(BoundLoopBehavior) || builder.hasBehavior(ChildRunnerBehavior)) return;

        const statement = statements[0];
        const blockKey = new BlockKey();
        const exerciseId = getExerciseId(statement);
        const context = new BlockContext(runtime, blockKey.toString(), exerciseId);

        const label = getContent(statement, "Effort");

        builder.setContext(context)
            .setKey(blockKey)
            .setBlockType("Effort")
            .setLabel(label) // Use text content as label
            .setSourceIds(statement.id ? [statement.id] : []);

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(statement.fragments || [], "Effort");
        builder.setFragments(fragmentGroups);

        builder.addBehaviorIfMissing(new ActionLayerBehavior(blockKey.toString(), fragmentGroups, statement.id ? [statement.id] : []));


        // Effort block usually has History
        builder.addBehavior(new HistoryBehavior({
            label: label,
            debugMetadata: createSpanMetadata(
                ['effort'],
                { strategyUsed: 'EffortFallbackStrategy' }
            )
        }));
    }
}
