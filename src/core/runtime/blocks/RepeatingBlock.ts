import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNode,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";

export class RepeatingBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(source: StatementNode) {
    super("repeating", source.id, source);
  }

  load(_runtime: ITimerRuntime): IRuntimeAction[] {
    console.log("Method not implemented.");
    return [];
  }

  next(_runtime: ITimerRuntime): StatementNode | undefined {
    console.log("Method not implemented.");
    return undefined;
  }
}
