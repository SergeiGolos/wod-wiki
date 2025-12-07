import { IRuntimeBlockStrategy } from "../IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "../IRuntimeBehavior";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../core/models/BlockKey";
import { ICodeStatement, CodeStatement } from "../../core/models/CodeStatement";
import { RuntimeBlock } from "../RuntimeBlock";
import { BlockContext } from "../BlockContext";
import { CompletionBehavior } from "../behaviors/CompletionBehavior";
import { RuntimeMetric } from "../RuntimeMetric";
import { PassthroughFragmentDistributor } from "../IDistributedFragments";

/**
 * Strategy that creates group blocks for nested/grouped exercises.
 * Matches statements that have child statements (nested structure).
 *
 * Example: "(3 rounds)\n  (2 rounds)\n    5 Pullups"
 * - Creates hierarchical block structure
 * - Parent groups contain child blocks
 * - Enables complex workout composition
 *
 * This strategy should be evaluated after specific strategies (Timer, Rounds, etc.)
 * but before the fallback EffortStrategy.
 *
 * This strategy now supports optional `behavior.group` hint from dialects.
 * Dialects can explicitly mark statements as groups.
 * The structural fallback (has children) is preserved for backward compatibility.
 *
 * Implementation Status: PARTIAL - Match logic complete with hints, compile logic needs full implementation
 *
 * TODO: Full compile() implementation requires:
 * 1. Extract child statements from code[0].children
 * 2. Create container RuntimeBlock with blockType="Group"
 * 3. Set up LoopCoordinatorBehavior to manage child compilation:
 *    - loopType: LoopType.FIXED with totalRounds=1 (execute once)
 *    - childGroups: [childStatements]
 * 4. Pass compilation context to children
 * 5. Handle nested groups recursively
 * 6. Group completes when all children complete
 *
 * Note: Groups are primarily structural containers. The parent block
 * (e.g., RoundsBlock) typically handles the looping logic, and groups
 * just organize exercises hierarchically.
 */
export class GroupStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) {
            console.warn('GroupStrategy: No statements provided');
            return false;
        }

        const statement = statements[0];
        
        // Check for explicit group hint from dialect
        // Parser may emit this for any indented block
        const isGroup = statement.hints?.has('behavior.group') ?? false;
        
        // Structural fallback: Has children
        const hasChildren = (statement.children && statement.children.length > 0) || false;

        // Match if explicit group hint OR has children
        return isGroup || hasChildren;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(code[0]?.fragments ?? [], "Group");

        // Compile statement fragments to metrics using FragmentCompilationManager (legacy compatibility)
        const compiledMetric: RuntimeMetric | undefined = runtime.fragmentCompiler
            ? runtime.fragmentCompiler.compileStatementFragments(
                code[0] as CodeStatement,
                runtime
            )
            : undefined;

        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = compiledMetric?.exerciseId || (code[0] as any)?.exerciseId || '';

        const context = new BlockContext(runtime, blockId, exerciseId);

        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new CompletionBehavior(
            () => true, // Temporary - should check children completion
            []
        ));

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Group",
            "Total Time",
            fragmentGroups
        );
    }
}
