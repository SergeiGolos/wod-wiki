import { IRuntimeAction, ITimerRuntime, RuntimeEvent } from "@/core/timer.types";



export class GoToStatementAction implements IRuntimeAction {
  constructor(public blockId: number) { }

  apply(runtime: ITimerRuntime): RuntimeEvent[] {
    const blocks = runtime.script.nodes;
    const block = blocks.find(block => block.id === this.blockId);

    if (block) {
      runtime.gotoBlock(block);
    }
    return [];
  }
}
