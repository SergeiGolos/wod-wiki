import { IRuntimeBlockStrategy } from "../IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "../IRuntimeBehavior";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IScriptRuntime } from "../IScriptRuntime";
import { BlockKey } from "../../core/models/BlockKey";
import { ICodeStatement } from "../../core/models/CodeStatement";
import { RuntimeBlock } from "../RuntimeBlock";
import { FragmentType } from "../../core/models/CodeFragment";
import { RepFragment } from "../../fragments/RepFragment";
import { EffortFragment } from "../../fragments/EffortFragment";
import { BlockContext } from "../BlockContext";
import { CompletionBehavior } from "../behaviors/CompletionBehavior";
import { MemoryTypeEnum } from "../MemoryTypeEnum";
import { TypedMemoryReference } from "../IMemoryReference";
import { EffortBlock } from "../blocks/EffortBlock";
import { TimerBehavior } from "../behaviors/TimerBehavior";
import { HistoryBehavior } from "../behaviors/HistoryBehavior";
import { createSpanMetadata } from "../utils/metadata";
import { PassthroughFragmentDistributor } from "../IDistributedFragments";
import { ActionLayerBehavior } from "../behaviors/ActionLayerBehavior";

/**
 * Helper to extract optional exerciseId from code statement.
 * Some dialect processors may attach exerciseId to statements.
 */
function getExerciseId(statement: ICodeStatement): string {
    const stmt = statement as ICodeStatement & { exerciseId?: string };
    return stmt.exerciseId ?? '';
}

/**
 * Helper to extract optional exerciseName from code statement.
 * Some dialect processors may attach exerciseName to statements.
 */
function getExerciseName(statement: ICodeStatement, defaultName: string): string {
    const stmt = statement as ICodeStatement & { exerciseName?: string };
    return stmt.exerciseName ?? defaultName;
}

/**
 * Strategy that creates effort blocks for simple exercises.
 * This is the fallback strategy that matches statements without
 * timer or rounds fragments.
 *
 * This strategy now supports explicit `behavior.effort` hint from dialects.
 * The hint takes priority and allows forcing effort behavior even on
 * complex lines via dialect configuration.
 *
 * Implementation Status: COMPLETE - Match logic uses hints with structural fallback
 */
export class EffortStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        if (!statements[0].fragments) return false;

        const statement = statements[0];

        // Explicit effort hint takes priority
        // Allows forcing effort behavior even on complex lines
        if (statement.hints?.has('behavior.effort')) {
            return true;
        }

        const hasTimer = statement.hasFragment(FragmentType.Timer);
        const hasRounds = statement.hasFragment(FragmentType.Rounds);

        // Structural fallback: Only match if NO timer AND NO rounds (pure effort)
        return !hasTimer && !hasRounds;
    }
    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const distributor = new PassthroughFragmentDistributor();
        const fragments = code[0]?.fragments || [];
        const fragmentGroups = distributor.distribute(fragments, "Effort");

        // 2. Generate BlockKey
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();

        // 3. Extract exerciseId from compiled metric or statement
        const exerciseId = getExerciseId(code[0]);

        // 4. Create BlockContext
        const context = new BlockContext(runtime, blockId, exerciseId);

        // 5. Extract reps from fragments or inherit from parent's public metric
        let reps: number | undefined = undefined;

        // Prefer explicit rep fragments when present
        const repsFragment = code[0]?.findFragment<RepFragment>(FragmentType.Rep);
        if (typeof repsFragment?.value === 'number') {
            reps = repsFragment.value;
        }

        // If no explicit reps, check for inherited reps from parent blocks
        if (reps === undefined) {
            const inheritedRepsRefs = runtime.memory.search({
                type: MemoryTypeEnum.METRIC_REPS,
                visibility: 'inherited',
                id: null,
                ownerId: null
            });

            if (inheritedRepsRefs.length > 0) {
                // Use the most recent inherited reps metric (last in array)
                const latestRepsRef = inheritedRepsRefs[inheritedRepsRefs.length - 1] as TypedMemoryReference<number>;
                const inheritedReps = runtime.memory.get(latestRepsRef);
                if (inheritedReps !== undefined) {
                    reps = inheritedReps;
                }
            }
        }

        // 6. Create behaviors
        const behaviors: IRuntimeBehavior[] = [];
        const actionBehavior = new ActionLayerBehavior(blockId, fragmentGroups, code[0]?.id ? [code[0].id] : []);
        behaviors.push(actionBehavior);

        // Effort blocks are leaf nodes that complete on first next() call (not on push)
        // This prevents recursion during mount where push -> complete -> pop -> next -> push...
        // TODO: If we need to support effort blocks with children, add LoopCoordinatorBehavior here

        // For generic Effort blocks (no reps), we want them to complete ONLY on user 'next' action
        // NOT on periodic 'tick' (which calls next())
        // So we disable checkOnNext, and rely on triggerEvents=['next']
        behaviors.push(new CompletionBehavior(
            () => true, // Always complete when checked
            ['next'], // Check on 'next' event (User Action)
            false, // Don't check on push
            false  // Don't check on next() (Tick)
        ));

        // 7. Create RuntimeBlock with context and compiled metrics
        // Use EffortBlock if reps are specified, otherwise fallback to generic RuntimeBlock
        // This ensures proper rep tracking and completion logic
        if (reps !== undefined) {
            const effortFragment = code[0]?.findFragment<EffortFragment>(FragmentType.Effort);
            const exerciseName = (typeof effortFragment?.value === 'string' && effortFragment.value.trim().length > 0)
                ? effortFragment.value
                : getExerciseName(code[0], "Exercise");

            return new EffortBlock(
                runtime,
                code[0]?.id ? [code[0].id] : [],
                {
                    exerciseName,
                    targetReps: reps
                },
                fragmentGroups
            );
        }

        // Add TimerBehavior for generic effort blocks (count up)
        // Segment timers should not override the main workout clock; mark as secondary
        behaviors.push(new TimerBehavior('up', undefined, 'Segment Timer', 'secondary'));

        // Add HistoryBehavior with debug metadata stamped at creation time
        // This ensures analytics can identify effort blocks
        behaviors.push(new HistoryBehavior({
            label: "Effort",
            debugMetadata: createSpanMetadata(
                ['effort', 'leaf_node'],
                {
                    strategyUsed: 'EffortStrategy',
                    exerciseId: exerciseId || undefined
                }
            )
        }));

        const block = new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Effort",
            "Effort",
            fragmentGroups
        );

        return block;
    }
}
