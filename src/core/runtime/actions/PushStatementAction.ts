import { IRuntimeAction } from "@/core/IRuntimeAction";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";

export class PushStatementAction implements IRuntimeAction {
  constructor(public statements: JitStatement[]) { }
  name: string = "goto";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {        
    var block = runtime.jit.compile(this.statements, runtime)        
    runtime.push(block);
  }
}
