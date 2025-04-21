import { IRuntimeAction, ITimerRuntime, IRuntimeEvent } from "@/core/timer.types";


export class CompleteStatementAction implements IRuntimeAction {
  constructor() { }

  apply(runtime: ITimerRuntime):  IRuntimeEvent[] {
    runtime.gotoComplete();
    return [];
  }
}


export class IdleStatementAction implements IRuntimeAction {
  constructor() { }

  apply(runtime: ITimerRuntime):  IRuntimeEvent[] {
    runtime.gotoBlock(undefined);
    return [];
  }
}
