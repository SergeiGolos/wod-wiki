import { IRuntimeAction, ITimerRuntime, RuntimeEvent } from "@/core/timer.types";


export class FirstStatementAction implements IRuntimeAction {
  constructor() { }
  apply(runtime: ITimerRuntime): RuntimeEvent[] {
    const block = runtime.script.leafs[0];
    if (block) {
      runtime.gotoBlock(block);
    }
    return [];
  }
}
