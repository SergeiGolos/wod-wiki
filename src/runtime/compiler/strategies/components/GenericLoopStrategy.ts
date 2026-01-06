import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { RoundsFragment } from "../../fragments/RoundsFragment";
import { BoundLoopBehavior } from "../../../behaviors/BoundLoopBehavior";
import { UnboundLoopBehavior } from "../../../behaviors/UnboundLoopBehavior";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../../../behaviors/ActionLayerBehavior";
import { RoundPerLoopBehavior } from "../../../behaviors/RoundPerLoopBehavior";
import { RepFragment } from "../../fragments/RepFragment";
import { RepSchemeBehavior } from "../../../behaviors/RepSchemeBehavior";
import { MemoryTypeEnum } from "../../../models/MemoryTypeEnum";

export class GenericLoopStrategy implements IRuntimeBlockStrategy {
    priority = 50;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        return statements[0].hasFragment(FragmentType.Rounds);
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // Check for any Loop behavior
        if (builder.hasBehavior(BoundLoopBehavior) || builder.hasBehavior(UnboundLoopBehavior)) {
            return;
        }

        const statement = statements[0];
        const roundsFragment = statement.findFragment<RoundsFragment>(FragmentType.Rounds);

        if (!roundsFragment) return;

        let totalRounds = 1;
        let repScheme: number[] | undefined = undefined;

        if (Array.isArray(roundsFragment.value)) {
            repScheme = roundsFragment.value as number[];
            totalRounds = repScheme.length;
        } else if (typeof roundsFragment.value === 'number') {
            totalRounds = roundsFragment.value;
            const repFragments = statement.filterFragments<RepFragment>(FragmentType.Rep) || [];
            if (repFragments.length > 0) {
                repScheme = repFragments.map(f => f.value as number);
            }
        }

        // If AmrapLogicStrategy ran, it might have added behaviors but NOT set the BlockType/Label if it didn't match perfectly?
        // No, AmrapLogicStrategy priority is 90. It should have run.
        // If it ran, it added UnboundLoopBehavior.
        // So the check above `builder.hasBehavior(UnboundLoopBehavior)` protects us.

        // However, in the failing test, AmrapLogicStrategy added UnboundLoopBehavior.
        // But my previous implementation of GenericLoopStrategy only checked for BoundLoopBehavior.
        // This caused GenericLoopStrategy to ALSO run, and overwrite/add BoundLoopBehavior.
        // And it likely overwrote the Label/Type as well?
        // builder.setBlockType("Rounds") overwrote "AMRAP".

        // This Fix (checking UnboundLoopBehavior) should solve the test failure.

        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), statement.exerciseId || '');

        builder.setContext(context)
               .setKey(blockKey)
               .setBlockType("Rounds")
               .setLabel(repScheme ? repScheme.join('-') : `${totalRounds} Rounds`)
               .setSourceIds(statement.id ? [statement.id] : []);

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(statement.fragments || [], "Rounds");
        builder.setFragments(fragmentGroups);
        builder.addBehaviorIfMissing(new ActionLayerBehavior(blockKey.toString(), fragmentGroups, statement.id ? [statement.id] : []));


        builder.addBehavior(new RoundPerLoopBehavior());

        if (repScheme && repScheme.length > 0) {
            builder.addBehavior(new RepSchemeBehavior(repScheme));

            context.allocate(
                MemoryTypeEnum.METRIC_REPS,
                repScheme[0],
                'inherited'
            );
        }

        builder.addBehavior(new BoundLoopBehavior(totalRounds));
    }
}
