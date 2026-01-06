import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { TimerFragment } from "../../fragments/TimerFragment";
import { BoundTimerBehavior } from "../../../behaviors/BoundTimerBehavior";
import { UnboundTimerBehavior } from "../../../behaviors/UnboundTimerBehavior";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { CompletionBehavior } from "../../../behaviors/CompletionBehavior";
import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";
import { ActionLayerBehavior } from "../../../behaviors/ActionLayerBehavior";

export class GenericTimerStrategy implements IRuntimeBlockStrategy {
    priority = 50; // Mid priority

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        // Match if timer fragment exists
        return statements[0].hasFragment(FragmentType.Timer);
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // If a TimerBehavior already exists (from High priority Logic strategy), do nothing
        if (builder.hasBehavior(BoundTimerBehavior) || builder.hasBehavior(UnboundTimerBehavior)) {
            return;
        }

        const statement = statements[0];
        const timerFragment = statement.findFragment<TimerFragment>(FragmentType.Timer);
        const direction = timerFragment?.direction || 'up';
        const durationMs = timerFragment?.value || undefined;
        const label = direction === 'down' ? 'Countdown' : 'For Time';

        // Basic context setup if not already done
        // (If Logic strategy ran, it set context. If not, we set it)
        // Wait, builder fields like context are private. We can't check them easily.
        // But we can check if behaviors exist.
        // We should ensure context is set. Strategies can re-set it, or we assume it's set by a Foundation strategy?
        // Let's assume each major strategy ensures context.
        // But we don't want to overwrite if set.
        // BlockBuilder doesn't expose getters.
        // We can just create a new one if we are the "Main" strategy.
        // But if we are a "Component" strategy, we might be adding to an existing block.
        // If Logic strategy didn't run, then WE are the main strategy for Timer.
        // If Logic strategy DID run (e.g. Amrap), it added Timer behavior.
        // So we already returned early.

        // Therefore, if we are here, we are the first to add Timer.
        // Use a block key if none provided? BlockBuilder doesn't expose "hasKey".
        // Use a flag? Or just set it?
        // Let's set it. "Last write wins" for properties is fine if we are filling gaps.

        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), statement.exerciseId || '');

        // Only set basics if we are "defining" the block (i.e. no complex logic ran)
        // We can't know for sure. But since we are lower priority, if Logic ran, it would have added behaviors.
        // If Logic ran but didn't add Timer (impossible for Amrap/Interval), we add it here.
        // Safe to set context/key again? Usually yes.

        builder.setContext(context)
               .setKey(blockKey)
               .setBlockType("Timer")
               .setLabel(label)
               .setSourceIds(statement.id ? [statement.id] : []);

        const distributor = new PassthroughFragmentDistributor();
        const fragmentGroups = distributor.distribute(statement.fragments || [], "Timer");
        builder.setFragments(fragmentGroups);
        builder.addBehaviorIfMissing(new ActionLayerBehavior(blockKey.toString(), fragmentGroups, statement.id ? [statement.id] : []));


        let timerBehavior: any;
        if (durationMs) {
            timerBehavior = new BoundTimerBehavior(durationMs, direction, label);
        } else {
            timerBehavior = new UnboundTimerBehavior(label);
        }
        builder.addBehavior(timerBehavior);

        if (durationMs) {
             builder.addBehavior(new CompletionBehavior(
                (_block, now) => timerBehavior.isComplete(now),
                ['timer:tick', 'timer:complete']
            ));
        }
    }
}
