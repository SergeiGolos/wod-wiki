import { IRuntimeAction, ITimerRuntime, IRuntimeEvent, OutputEvent, StatementNode, IRuntimeBlock } from "@/core/timer.types";
import { Subject } from "rxjs";

export class NextStatementAction implements IRuntimeAction {
  name: string = "next";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {    
        
    let block : IRuntimeBlock | undefined;
    let next: StatementNode | undefined;
    do {      
      block = runtime.trace.pop();      
      next = block?.next();
    } while (block && !next && block.blockKey !== "root");

    if (!next) {
      runtime.push(runtime.jit.idle(runtime));
      return;
    }

    if (next.id == block?.blockId || block?.blockKey == "root") 
    {
      runtime.push(block);
      return;
    }

    runtime.push(runtime.jit.compile(runtime, next));
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
