import { IRuntimeBlockStrategy } from "../../contracts/IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "../../contracts/IRuntimeBehavior";
import { IRuntimeBlock } from "../../contracts/IRuntimeBlock";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { BlockKey } from "../../../core/models/BlockKey";
import { ICodeStatement } from "../../../core/models/CodeStatement";
import { RuntimeBlock } from "../../RuntimeBlock";
import { FragmentType } from "../../../core/models/CodeFragment";
import { RepFragment } from "../fragments/RepFragment";
import { EffortFragment } from "../fragments/EffortFragment";
import { BlockContext } from "../../BlockContext";
import { MemoryTypeEnum } from "../../models/MemoryTypeEnum";
import { TypedMemoryReference } from "../../contracts/IMemoryReference";
import { EffortBlock } from "../../blocks/EffortBlock";
import { UnboundTimerBehavior } from "../../behaviors/UnboundTimerBehavior";
import { HistoryBehavior } from "../../behaviors/HistoryBehavior";
import { createSpanMetadata } from "../../utils/metadata";
import { PassthroughFragmentDistributor } from "../../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../../behaviors/ActionLayerBehavior";
import { SinglePassBehavior } from "../../behaviors/SinglePassBehavior";
import { RoundPerNextBehavior } from "../../behaviors/RoundPerNextBehavior";

/**
 * Helper to extract optional exerciseId from code statement.
 */
function getExerciseId(statement: ICodeStatement): string {
    const stmt = statement as ICodeStatement & { exerciseId?: string };
    return stmt.exerciseId ?? '';
}

/**
 * Helper to extract optional exerciseName from code statement.
 */
function getExerciseName(statement: ICodeStatement, defaultName: string): string {
    const stmt = statement as ICodeStatement & { exerciseName?: string };
    return stmt.exerciseName ?? defaultName;
}

/**
 * Strategy that creates effort blocks for simple exercises.
 */
export class EffortStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        if (!statements[0].fragments) return false;

        const statement = statements[0];
        if (statement.hints?.has('behavior.effort')) {
            return true;
        }

        const hasTimer = statement.hasFragment(FragmentType.Timer);
        const hasRounds = statement.hasFragment(FragmentType.Rounds);

        return !hasTimer && !hasRounds;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const distributor = new PassthroughFragmentDistributor();
        const fragments = code[0]?.fragments || [];
        const fragmentGroups = distributor.distribute(fragments, "Effort");

        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = getExerciseId(code[0]);
        const context = new BlockContext(runtime, blockId, exerciseId);

        let reps: number | undefined = undefined;
        const repsFragment = code[0]?.findFragment<RepFragment>(FragmentType.Rep);
        if (typeof repsFragment?.value === 'number') {
            reps = repsFragment.value;
        }

        if (reps === undefined) {
            const inheritedRepsRefs = runtime.memory.search({
                type: MemoryTypeEnum.METRIC_REPS,
                visibility: 'inherited',
                id: null,
                ownerId: null
            });

            if (inheritedRepsRefs.length > 0) {
                const latestRepsRef = inheritedRepsRefs[inheritedRepsRefs.length - 1] as TypedMemoryReference<number>;
                const inheritedReps = runtime.memory.get(latestRepsRef);
                if (inheritedReps !== undefined) {
                    reps = inheritedReps;
                }
            }
        }

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

        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new ActionLayerBehavior(blockId, fragmentGroups, code[0]?.id ? [code[0].id] : []));

        // Use SinglePassBehavior instead of CompletionBehavior for 'next' handling
        // CompletionBehavior listening to 'next' conflicts with NextEventHandler

        behaviors.push(new RoundPerNextBehavior());
        behaviors.push(new SinglePassBehavior());
        behaviors.push(new UnboundTimerBehavior('Segment Timer', 'secondary'));

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

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Effort",
            "Effort",
            fragmentGroups
        );
    }
}
