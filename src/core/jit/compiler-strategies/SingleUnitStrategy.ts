import { RuntimeBlock } from "@/core/runtime/blocks/RuntimeBlock";
import { RuntimeStack } from "@/core/runtime/RuntimeStack";
import { StatementNode, IRuntimeAction } from "@/core/timer.types";
import { ICompilerStrategy } from "./CompoundStrategy";
import { SetDisplayAction } from "@/core/runtime/actions/SetDisplayAction";

export class SingleUnitStrategy implements ICompilerStrategy {
  apply(stack: StatementNode[], runtime: RuntimeStack): IRuntimeAction[] {
    // Safety check: Make sure we have a current node
    if (!stack || stack.length === 0) {
      return [];
    }

    const current = stack[0];
    
    // Safety check: Make sure current exists
    if (!current) {
      return [];
    }
    
    if (current.children.length > 0) {
      return [];
    }
    
    // Create a RuntimeBlock instance
    const block = new RuntimeBlock(current, []);
    
    // Create a display update action
    const display = {
      elapsed: 0,
      state: "ready",
      label: current.type || "Single Unit",
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
