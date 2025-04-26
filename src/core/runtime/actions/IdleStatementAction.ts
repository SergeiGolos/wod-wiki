import { IRuntimeAction, ITimerRuntime, IRuntimeEvent } from "@/core/timer.types";


export class CompleteStatementAction implements IRuntimeAction {
  constructor() { }
  name: string = 'set-complete';
  apply(runtime: ITimerRuntime):  IRuntimeEvent[] {
    runtime.goto(undefined);
    return [];
  }
}


export class IdleStatementAction implements IRuntimeAction {
  constructor() { }
  name: string = 'set-idle';
  apply(runtime: ITimerRuntime): IRuntimeEvent[] {
    runtime.goto(undefined);
    return [];
  }
}
