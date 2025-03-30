import { RuntimeBlock } from "@/core/runtime/blocks/RuntimeBlock";
import { RuntimeStack } from "@/core/parser/RuntimeStack";
import { StatementNode, IRuntimeAction } from "@/core/timer.types";
import { fragmentToPart } from "@/core/utils";
import { ICompilerStrategy } from "./CompoundStrategy";
import { SetDisplayAction } from "@/core/runtime/actions/SetDisplayAction";

export class RepeatingGroupStrategy implements ICompilerStrategy {
  apply(stack: StatementNode[], runtime: RuntimeStack): IRuntimeAction[] {
    // Safety check: Make sure we have a current node
    if (!stack || stack.length === 0) {
      return [];
    }

    const current = stack[0];
    
    // Safety check: Make sure current.fragments exists
    if (!current || !current.fragments) {
      return [];
    }
    
    const rounds = fragmentToPart(current.fragments, "rounds");
    if (!rounds || current.children.length === 0) {
      return [];
    }

    const childBlocks = current.children
      .map((childId: number) => {
        const childNode = runtime.getIndex(runtime.getId(childId)!);
        return childNode;
      })
      .filter((node: StatementNode | undefined): node is StatementNode => node !== undefined);

    // Create a RuntimeBlock instance
    const block = new RuntimeBlock(current, childBlocks);
    
    // Create a display update action
    const display = {
      elapsed: 0,
      state: "ready",
      label: block.label,
      round: block.currentRound,
      totalRounds: block.totalRounds
    };
    
    // Create a runtime event
    const event = {
      name: "block_started",
      timestamp: new Date()
    };
    
    // Return display update action
    return [new SetDisplayAction(event, display)];
  }
}
