import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  IdleStatementNode,
  StatementNode,
  StatementNodeDetail,
  ResultSpan,
  RuntimeMetric,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import {
  PushIdleBlockAction,
  PushEndBlockAction,
  PushStatementAction,
} from "../actions/PushStatementAction";
import { PopBlockAction } from "../actions/PopBlockAction";
import { WriteResultAction } from "../outputs/WriteResultAction";

/**
 * Represents the root of the execution tree.
 * Often wraps a single main block (like a CompoundBlock or RepeatingBlock).
 */
export class RootBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(private statements: StatementNode[]) {
    super([new IdleStatementNode() as StatementNodeDetail]);
  }

  enter(_runtime: ITimerRuntime): IRuntimeAction[] {    
    console.log(`+=== enter : ${this.blockKey}`);
    const children = this.statements
      .filter((s) => s.parent === undefined)
      .map((s) => s.id);
    this.sources[0].children = [...children];

    return [new PushIdleBlockAction()];
  }

  next(_runtime: ITimerRuntime): IRuntimeAction[] {
    this.index += 1;
    if (this.index > this.statements.length) {
      return [new PopBlockAction()];
    }

    const statement = this.statements[this.index-1];
    return [new PushStatementAction([statement])];
  }

  leave(runtime: ITimerRuntime): IRuntimeAction[] {
    console.log(`+=== leave : ${this.blockKey}`);
    
    // Create a result span to report completion of the entire workout
    const resultSpan = new ResultSpan();
    resultSpan.blockKey = this.blockKey;
    resultSpan.index = this.index;
    resultSpan.stack = [];
    resultSpan.start = runtime.history[0] ?? { name: "start", timestamp: new Date() };
    resultSpan.stop = { timestamp: new Date(), name: "root_complete" };
    resultSpan.label = "Workout Complete";
    
    // Add overall workout metrics if available
    const metric: RuntimeMetric = {
      effort: "Workout",
      values: []
    };
    
    // You could add summary metrics here if needed
    resultSpan.metrics.push(metric);
    
    return [
      new WriteResultAction(resultSpan),
      new PushEndBlockAction()
    ];
  }
}
