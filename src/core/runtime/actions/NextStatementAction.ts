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
    while (true) {      
      const laps = fragmentTo<RoundsFragment>(current!, 'rounds')?.count ?? 0;
      const round = runtime.trace!.get(current?.id ?? -1) + 1;
      
      console.log("Next: Block", {
        id: current?.id,
        round: `${round}/${laps || '∞'}`,
        children: current?.children.length
      });
          
      if (laps != 0 && round > laps) {
        blockId = current?.next;
        console.log("Next: Rounds complete, moving to", blockId);
        break;
      }

      if (current?.children.length == 0) {
        blockId = current?.id;
        console.log("Next: Leaf node, repeating", blockId);
        break;
      }
        
      const childIndex = round % current!.children.length;
      const childId = current!.children[childIndex];
      current = blocks.find(block => block.id == childId);
      console.log("Next: Moving to child", childId);
    }

    const nextBlock = blocks.find(block => block.id == blockId);
    console.log("Next: Selected", blockId);
    runtime.gotoBlock(nextBlock);
    return [{name:'start', timestamp: new Date()}];
  }
}
