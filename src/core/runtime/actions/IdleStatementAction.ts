import { IRuntimeAction, ITimerRuntime, IRuntimeEvent } from "@/core/timer.types";

export class IdleStatementAction implements IRuntimeAction {
  constructor() { }
  name: string = 'set-idle';
  apply(runtime: ITimerRuntime): IRuntimeEvent[] {
    runtime.push(runtime.jit.idle(runtime));
    return [];
  }
}
