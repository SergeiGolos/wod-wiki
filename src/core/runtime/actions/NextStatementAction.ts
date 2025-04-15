import { IRuntimeAction, ITimerRuntime, RuntimeEvent } from "@/core/timer.types";

export class NextStatementAction implements IRuntimeAction {
  constructor() { }

  apply(runtime: ITimerRuntime):  RuntimeEvent[]   {
    const blocks = runtime.script.nodes;        
    let current = runtime.current?.stack?.[0];
    
    let blockId: number | undefined;        
    const round = runtime.trace!.get(current?.id ?? -1) + 1;        
    
    if (current?.rounds == 0 && round > current?.rounds) {
      blockId = current?.parent ?? current?.next;
    } else {
      blockId = current?.id;
    }

    const nextBlock = blocks.find(block => block.id == blockId);    
    const leaf = runtime.gotoBlock(nextBlock);
    console.log("Next Action Leaf:", leaf);
    return leaf && leaf.type !== 'idle' && leaf.type !== 'done' 
      ? [{name:'start', timestamp: new Date()}] 
      : [{name:'end', timestamp: new Date()}];
} 
}
