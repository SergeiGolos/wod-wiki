import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";

export class IdleStatementAction implements IRuntimeAction {
  constructor() { }
  name: string = 'set-idle';
  apply(runtime: ITimerRuntime): IRuntimeEvent[] {
    runtime.push(runtime.jit.idle(runtime));
    return [];
  }
}
