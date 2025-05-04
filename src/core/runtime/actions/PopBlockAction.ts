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
        
    let block : IRuntimeBlock | undefined;
    let next: StatementNode | undefined;
    do {                
      block = runtime.trace.current();      
      next = block?.next(runtime);      
      if (next == undefined && !(block instanceof RootBlock)) {
        runtime.pop();
      }
      
    } while (block && !next);

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
