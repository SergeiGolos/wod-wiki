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

        builder.addBehavior(new ChildIndexBehavior(children.length));
        builder.addBehavior(new ChildRunnerBehavior(children));

        // Logic to determine if we need to add a default loop behavior (SinglePass).
        // If NO loop behavior exists, we imply a "Single Pass" loop.

        // We check for all known loop behaviors.
        const hasLoop = builder.hasBehavior(BoundLoopBehavior) ||
                        builder.hasBehavior(UnboundLoopBehavior) ||
                        builder.hasBehavior(RoundPerLoopBehavior);

        if (!hasLoop) {
             builder.addBehavior(new RoundPerLoopBehavior());
             builder.addBehavior(new SinglePassBehavior());
        }
    }
}
