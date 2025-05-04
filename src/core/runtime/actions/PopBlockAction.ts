import { IRuntimeAction, ITimerRuntime, IRuntimeEvent, OutputEvent, StatementNode, IRuntimeBlock } from "@/core/timer.types";
import { Subject } from "rxjs";
import { RootBlock } from "../blocks/RootBlock";

export class NextStatementAction implements IRuntimeAction {
  name: string = "next";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {    
    // Find the next valid block using the popUntil method
    // Pop blocks until we find one that has a valid next statement or is a RootBlock
    const block = runtime.trace.popUntil((block) => {
      const next = block.next(runtime);
      // Keep this block if it has a next statement or if it's a RootBlock
      return next !== undefined || block instanceof RootBlock;
    });
    
    // Get the next statement from the block (if it exists)
    const next = block?.next(runtime);

    if (!next) {
      runtime.push(runtime.jit.idle(runtime));
      return;
    }
    
    runtime.push(runtime.jit.compile(next, runtime));
  }
}


export class PopBlockAction implements IRuntimeAction {
  name: string = "pop";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    runtime.pop();
  }
}
