import { IRuntimeAction, StatementNode, ITimerRuntime, IRuntimeEvent, OutputEvent } from "@/core/timer.types";
import { Subject } from "rxjs";


export class PushIdleBlockAction implements IRuntimeAction {
  name: string = "goto";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    runtime.push(runtime.jit.idle(runtime));
  }
}

export class PushEndBlockAction implements IRuntimeAction {
  name: string = "goto";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    runtime.push(runtime.jit.end(runtime));
  }
}

export class PushStatementAction implements IRuntimeAction {
  constructor(public statements: StatementNode[], public pop: boolean = true) { }
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
