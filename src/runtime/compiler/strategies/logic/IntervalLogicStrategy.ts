import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
// import { BoundTimerBehavior } from "../../../behaviors/BoundTimerBehavior";
// import { BoundLoopBehavior } from "../../../behaviors/BoundLoopBehavior";
// import { IntervalWaitingBehavior } from "../../../behaviors/IntervalWaitingBehavior";
// import { IntervalTimerRestartBehavior } from "../../../behaviors/IntervalTimerRestartBehavior";
// import { TimerFragment } from "../../fragments/TimerFragment";
// import { RoundsFragment } from "../../fragments/RoundsFragment";
// import { BlockContext } from "../../../BlockContext";
// import { BlockKey } from "@/core/models/BlockKey";
// import { createSpanMetadata } from "../../../utils/metadata";
// import { HistoryBehavior } from "../../../behaviors/HistoryBehavior";
// import { PassthroughFragmentDistributor } from "../../../contracts/IDistributedFragments";
// import { ActionLayerBehavior } from "../../../behaviors/ActionLayerBehavior";

export class IntervalLogicStrategy implements IRuntimeBlockStrategy {
    priority = 90;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        const statement = statements[0];
        const fragments = statement.fragments;
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const isInterval = statement.hints?.has('behavior.repeating_interval') ?? false;

        // EMOM can be parsed as 'Action' OR 'Effort' depending on parser version.
        // The debug test showed it as fragmentType: 'effort' for '1:00 EMOM 10'
        const hasEmomAction = fragments.some(
            f => (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort)
                && typeof f.value === 'string'
                && f.value.toLowerCase() === 'emom'
        );
        return hasTimer && (isInterval || hasEmomAction);
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // TODO: Reimplement behaviors with IBehaviorContext
    }
}
