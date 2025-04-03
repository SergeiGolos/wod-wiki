import { IRuntimeAction, ITimerRuntime, RuntimeEvent } from "@/core/timer.types";


export class NextStatementAction implements IRuntimeAction {
  constructor() { }

  apply(runtime: ITimerRuntime):  RuntimeEvent[]   {
    const blocks = runtime.script.leafs;
    const index = blocks.findIndex(block => block.id == runtime.current!.blockId);    
    const block = blocks.length  < index + 1 ? blocks[index + 1] : undefined;
    console.log('NextStatementAction apply triggered for block:', block);
    
    runtime.gotoBlock(block);
    return block
      ? [{name:'start', timestamp: new Date()}]
      : [];
  }
}
