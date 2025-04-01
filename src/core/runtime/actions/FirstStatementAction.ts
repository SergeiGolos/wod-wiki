import { IRuntimeAction, ITimerRuntime } from "@/core/timer.types";


export class FirstStatementAction implements IRuntimeAction {
  constructor() { }
  apply(runtime: ITimerRuntime): void {
    const block = runtime.script.leafs[0];

    if (block) {
      runtime.gotoBlock(block);
    }
  }
}
