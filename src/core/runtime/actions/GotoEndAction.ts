import { IRuntimeAction } from "@/core/IRuntimeAction";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";


export class GotoEndAction implements IRuntimeAction {
  name: string = "End";
  apply(runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>, _output: Subject<OutputEvent>): IRuntimeEvent[] {        
    
    while (runtime.trace.stack.length > 0) {
      runtime.pop();            
    }
    
    runtime.push(runtime.jit.end(runtime));    
    return [];
  }
}
