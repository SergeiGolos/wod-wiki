import { IRuntimeAction, ITimerRuntime, RuntimeEvent } from "@/core/timer.types";



export class IdleStatementAction implements IRuntimeAction {
  constructor() { }

  apply(runtime: ITimerRuntime):  RuntimeEvent[] {
    runtime.gotoBlock(undefined);
    return [];
  }
}
