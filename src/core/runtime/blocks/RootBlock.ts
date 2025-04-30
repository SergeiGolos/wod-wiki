import {
  IDuration,
  IRuntimeBlock,
  IRuntimeEvent,
  ITimerRuntime,
  StatementNode,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";

/**
 * Represents the root of the execution tree.
 * Often wraps a single main block (like a CompoundBlock or RepeatingBlock).
 */
export class RootBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(statements: StatementNode[]) {
    const children = statements
      .filter((s) => s.parent === undefined)
      .map((s) => s.id);

    super(
      -1,
      "root",
      {
        id: -1,
        children: [...children],
        meta: {
          line: 0,
          startOffset: 0,
          endOffset: 0,
          columnStart: 0,
          columnEnd: 0,
          length: 0,
        },
        fragments: [],
      },
      undefined
    );
  }

  load(runtime: ITimerRuntime): IRuntimeEvent[] {
    console.log("Method not implemented.");
    return [];
  }

  next(runtime: ITimerRuntime): StatementNode | undefined {
    console.log("Method not implemented.");
    return undefined;
  }
}
