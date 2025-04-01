import { IRuntimeAction, ITimerRuntime } from "@/core/timer.types";

export class IdleStatementAction implements IRuntimeAction {
  constructor() { }

  apply(runtime: ITimerRuntime): void {
    runtime.gotoBlock(undefined);
  }
}

export class NextStatementAction implements IRuntimeAction {
  constructor(public blockId: number) { }

  apply(runtime: ITimerRuntime): void {
    const blocks = runtime.script.leafs;
    const block = blocks.find(block => block.id === this.blockId);

    if (block) {
      runtime.gotoBlock(block);
    }
  }
}
