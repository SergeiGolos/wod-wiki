import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  SourceCodeMetadata,
  StatementNode,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";

class ZeroIndexMeta implements SourceCodeMetadata {
  line = 0;
  startOffset = 0;
  endOffset = 0;
  columnStart = 0;
  columnEnd = 0;
  length = 0;      
}
/**
 * Represents the root of the execution tree.
 * Often wraps a single main block (like a CompoundBlock or RepeatingBlock).
 */
export class RootBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor(statements: StatementNode[]) {
    const children = statements
      .filter((s) => s.parent === undefined)
      .map((s) => s.id);

    super("root", -1, {
      id: -1,
      children: [...children],
      meta: new ZeroIndexMeta(),
      fragments: []
    });
  }

  load(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }

  next(_runtime: ITimerRuntime): StatementNode | undefined {      
    if ((this.source?.children.length ?? 0) >= this.runtimeIndex) {

      return undefined;
    }
      
    const childId = this.source?.children[this.runtimeIndex];
    const stack =  _runtime.script.getId(childId ?? -1);
    return stack.length > 0 ? stack[0] : undefined;
  }
}
