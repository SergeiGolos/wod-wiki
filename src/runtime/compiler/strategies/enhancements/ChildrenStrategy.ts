import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { ChildRunnerBehavior } from "../../../behaviors/ChildRunnerBehavior";
import { ChildIndexBehavior } from "../../../behaviors/ChildIndexBehavior";
import { RoundPerLoopBehavior } from "../../../behaviors/RoundPerLoopBehavior";
import { SinglePassBehavior } from "../../../behaviors/SinglePassBehavior";
import { BoundLoopBehavior } from "../../../behaviors/BoundLoopBehavior";
import { UnboundLoopBehavior } from "../../../behaviors/UnboundLoopBehavior";
import { BoundTimerBehavior } from "../../../behaviors/BoundTimerBehavior";

export class ChildrenStrategy implements IRuntimeBlockStrategy {
    priority = 50;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        return statements && statements.length > 0 && statements[0].children && statements[0].children.length > 0;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        if (builder.hasBehavior(ChildRunnerBehavior)) {
            return;
        }

        const children = statements[0].children;

        // Add ChildIndexBehavior first - it must update the index before RoundPerLoopBehavior checks hasJustWrapped
        builder.addBehavior(new ChildIndexBehavior(children.length));

        // Always add RoundPerLoopBehavior after ChildIndexBehavior for child-based round counting.
        // This ensures rounds increment when all children complete, not on every next() call.
        if (!builder.hasBehavior(RoundPerLoopBehavior)) {
            builder.addBehavior(new RoundPerLoopBehavior());
        }

        // If no loop bound behavior exists, add a default (SinglePass or UnboundLoop).
        const hasLoopBound = builder.hasBehavior(BoundLoopBehavior) ||
            builder.hasBehavior(UnboundLoopBehavior) ||
            builder.hasBehavior(SinglePassBehavior);

        if (!hasLoopBound) {
            // Check if we have a BoundTimer (Countdown). If so, default to Infinite Loop (AMRAP style).
            // UnboundTimer (For Time) implies Single Pass (task priority).
            const hasBoundTimer = builder.hasBehavior(BoundTimerBehavior);

            if (hasBoundTimer) {
                 builder.addBehavior(new UnboundLoopBehavior());
            } else {
                 builder.addBehavior(new SinglePassBehavior());
            }
        }

        builder.addBehavior(new ChildRunnerBehavior(children));
    }
}
