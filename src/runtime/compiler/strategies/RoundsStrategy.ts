import { IRuntimeBlockStrategy } from "../../contracts/IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "../../contracts/IRuntimeBehavior";
import { IRuntimeBlock } from "../../contracts/IRuntimeBlock";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { BlockKey } from "../../../core/models/BlockKey";
import { ICodeStatement } from "../../../core/models/CodeStatement";
import { RuntimeBlock } from "../../RuntimeBlock";
import { FragmentType } from "../../../core/models/CodeFragment";
import { RoundsFragment } from "../fragments/RoundsFragment";
import { RepFragment } from "../fragments/RepFragment";
import { BlockContext } from "../../BlockContext";
import { MemoryTypeEnum } from "../../models/MemoryTypeEnum";
import { HistoryBehavior } from "../../behaviors/HistoryBehavior";
import { BoundLoopBehavior } from "../../behaviors/BoundLoopBehavior";
import { ChildIndexBehavior } from "../../behaviors/ChildIndexBehavior";
import { RoundPerLoopBehavior } from "../../behaviors/RoundPerLoopBehavior";
import { RepSchemeBehavior } from "../../behaviors/RepSchemeBehavior";
import { createSpanMetadata } from "../../utils/metadata";
import { PassthroughFragmentDistributor } from "../../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../../behaviors/ActionLayerBehavior";
import { ChildRunnerBehavior } from "../../behaviors/ChildRunnerBehavior";
import { RoundDisplayBehavior } from "../../behaviors/RoundDisplayBehavior";
import { RoundSpanBehavior } from "../../behaviors/RoundSpanBehavior";
import { LapTimerBehavior } from "../../behaviors/LapTimerBehavior";

/**
 * Helper to extract optional exerciseId from code statement.
 */
function getExerciseId(statement: ICodeStatement): string {
    const stmt = statement as ICodeStatement & { exerciseId?: string };
    return stmt.exerciseId ?? '';
}

/**
 * Strategy that creates rounds-based parent blocks for multi-round workouts.
 */
export class RoundsStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) {
            return false;
        }

        if (!statements[0].fragments) {
            return false;
        }

        const statement = statements[0];
        const isFixedRounds = statement.hints?.has('behavior.fixed_rounds') ?? false;
        const hasRounds = statement.hasFragment(FragmentType.Rounds);
        const hasTimer = statement.hasFragment(FragmentType.Timer);

        return (isFixedRounds || hasRounds) && !hasTimer;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(code[0]?.fragments || [], "Rounds");

        const exerciseId = getExerciseId(code[0]);
        const roundsFragment = code[0]?.findFragment<RoundsFragment>(FragmentType.Rounds);

        if (!roundsFragment) {
            throw new Error('RoundsStrategy requires Rounds fragment');
        }

        let totalRounds = 1;
        let repScheme: number[] | undefined = undefined;

        if (Array.isArray(roundsFragment.value)) {
            repScheme = roundsFragment.value as number[];
            totalRounds = repScheme.length;
        } else if (typeof roundsFragment.value === 'number') {
            totalRounds = roundsFragment.value;
            const repFragments = code[0]?.filterFragments<RepFragment>(FragmentType.Rep) || [];
            if (repFragments.length > 0) {
                repScheme = repFragments.map(f => f.value as number);
            }
        }

        const children = code[0]?.children || [];

        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const context = new BlockContext(runtime, blockId, exerciseId);

        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new ActionLayerBehavior(blockId, fragmentGroups, code[0]?.id ? [code[0].id] : []));

        // 1. Loop Behaviors
        behaviors.push(new ChildIndexBehavior(children.length));
        behaviors.push(new RoundPerLoopBehavior());

        if (repScheme && repScheme.length > 0) {
            behaviors.push(new RepSchemeBehavior(repScheme));
        }

        behaviors.push(new BoundLoopBehavior(totalRounds));

        // 2. Child Execution
        behaviors.push(new ChildRunnerBehavior(children));

        // 3. History Behavior
        behaviors.push(new HistoryBehavior({
            label: "Rounds",
            debugMetadata: createSpanMetadata(
                ['rounds', repScheme ? 'rep_scheme' : 'fixed_rounds'],
                {
                    strategyUsed: 'RoundsStrategy',
                    totalRounds,
                    ...(repScheme && { repScheme })
                }
            )
        }));

        // 4. Round Display & Tracking (decomposed from LoopCoordinatorBehavior)
        behaviors.push(new RoundDisplayBehavior(totalRounds));
        behaviors.push(new RoundSpanBehavior('rounds', repScheme, totalRounds));
        behaviors.push(new LapTimerBehavior());

        // Allocate initial reps if scheme exists
        if (repScheme && repScheme.length > 0) {
            context.allocate(
                MemoryTypeEnum.METRIC_REPS,
                repScheme[0],
                'inherited'
            );
        }

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Rounds",
            repScheme ? repScheme.join('-') : `${totalRounds} Rounds`,
            fragmentGroups
        );
    }
}
