import { IRuntimeAction, StatementNode, ITimerRuntime, IRuntimeEvent, OutputEvent, IRuntimeBlock } from "@/core/timer.types";
import { Subject } from "rxjs";


export class PushBlockAction implements IRuntimeAction {
  constructor(public block: IRuntimeBlock, public pop: boolean = true) { }
  name: string = "goto";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    runtime.push(this.block);
  }
}

export class PushStatementAction implements IRuntimeAction {
  constructor(public statement: StatementNode, public pop: boolean = true) { }
  name: string = "goto";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {        
    var block = runtime.jit.compile(runtime, this.statement)        
    runtime.push(block);
  }
}
