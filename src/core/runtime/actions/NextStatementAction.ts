import { RoundsFragment } from "@/core/fragments/RoundsFragment";
import { IRuntimeAction, ITimerRuntime, RuntimeEvent } from "@/core/timer.types";
import { fragmentTo } from "@/core/utils";

export class NextStatementAction implements IRuntimeAction {
  constructor() { }

  apply(runtime: ITimerRuntime):  RuntimeEvent[]   {
    const blocks = runtime.script.nodes;        
    let current = runtime.current?.stack?.[runtime.current?.stack?.length - 1];
    
    console.log("NextStatementAction: Starting from stack:", {
      stackLength: runtime.current?.stack?.length,
      currentBlockId: current?.id,
      currentChildren: current?.children,
      currentNext: current?.next
    });

    let blockId: number | undefined;
    while (true) {      
      const laps = fragmentTo<RoundsFragment>(current!, 'rounds')?.count ?? 0;
      const round = runtime.trace!.get(current?.id ?? -1) + 1;
      
      console.log("NextStatementAction: Processing block:", {
        blockId: current?.id,
        laps,
        currentRound: round,
        childrenCount: current?.children.length,
        nextBlockId: current?.next
      });
          
      if (laps != 0 && round > laps) {
        console.log("NextStatementAction: Completed all rounds", {
          blockId: current?.id,
          completedRounds: round,
          totalLaps: laps,
          movingToNext: current?.next
        });
        blockId = current?.next;
        break;
      }

      if (current?.children.length == 0) {
        console.log("NextStatementAction: Leaf node, repeating", {
          blockId: current?.id,
          currentRound: round,
          totalLaps: laps
        });
        blockId = current?.id;
        break;
      }
        
      const childIndex = round % current!.children.length;
      const childId = current!.children[childIndex];
      console.log("NextStatementAction: Moving to child", {
        parentId: current?.id,
        round,
        childrenCount: current!.children.length,
        selectedChildIndex: childIndex,
        selectedChildId: childId
      });

      current = blocks.find(block => block.id == childId);      
    }

    const nextBlock = blocks.find(block => block.id == blockId);
    console.log("NextStatementAction: Final selection", {
      selectedBlockId: blockId,
      found: !!nextBlock,
      nextBlockChildren: nextBlock?.children,
      nextBlockNext: nextBlock?.next
    });

    runtime.gotoBlock(nextBlock);
    return [{name:'start', timestamp: new Date()}];
  }
}
