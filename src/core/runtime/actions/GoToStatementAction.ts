import {
  IRuntimeAction,
  ITimerRuntime,
  IRuntimeEvent,
  OutputEvent,
  StatementNode,
} from "@/core/timer.types";
import { Subject } from "rxjs";

export class GoToStatementAction implements IRuntimeAction {
  constructor(public statement: StatementNode) {}
  name: string = "goto";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {    
    runtime.next(runtime.jit.compile(runtime, this.statement));
  }
}
