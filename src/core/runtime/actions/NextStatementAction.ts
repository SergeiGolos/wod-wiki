import { RoundsFragment } from "@/core/fragments/RoundsFragment";
import { IRuntimeAction, ITimerRuntime, RuntimeEvent } from "@/core/timer.types";
import { fragmentTo } from "@/core/utils";

export class NextStatementAction implements IRuntimeAction {
  constructor() { }

  apply(runtime: ITimerRuntime):  RuntimeEvent[]   {
    const blocks = runtime.script.nodes;        
    let current = runtime.current?.stack?.[runtime.current?.stack?.length - 1];
    
    console.log("Next: Initial state", {
      currentId: current?.id,
      stackSize: runtime.current?.stack?.length
    });

    let blockId: number | undefined;    
    const totalRounds = fragmentTo<RoundsFragment>(current!, 'rounds')?.count ?? 0;
    const round = runtime.trace!.get(current?.id ?? -1) + 1;
    
    console.log("Next: Block", {
      id: current?.id,
      round: `${round}/${totalRounds || '∞'}`,
      children: current?.children.length
    });
        
    if (totalRounds == 0 && round > totalRounds) {
      console.log("Next: Rounds complete, moving to", current?.parent ?? current?.next);
      blockId = current?.parent ?? current?.next;
    } else {
      console.log("Next: Rounds not complete, repeating", current?.id);      
    }

    const nextBlock = blocks.find(block => block.id == blockId);    
    const leaf = runtime.gotoBlock(nextBlock);
    console.log("Next: Leaf", leaf);
    return leaf ? [{name:'start', timestamp: new Date()}] : [];
  }
}
