import { IRuntimeAction, ITimerRuntime, IRuntimeEvent, OutputEvent, StatementNode } from "@/core/timer.types";
import { Subject } from "rxjs";

export class NextStatementAction implements IRuntimeAction {
  name: string = "next";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {    
    
    let next: StatementNode | undefined;
    let block = runtime.trace.current();    
    while (block && !next) {      
      next = block.next();  
      if (!next) {
        if (!block.parent) {
          block = undefined;
        } else {
          block = runtime.trace.pop();
        }
      }
    }      

    if (next) {
      runtime.push(runtime.jit.compile(runtime, next));
    }
    else
    {
      runtime.push(runtime.jit.idle(runtime));
    }
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
