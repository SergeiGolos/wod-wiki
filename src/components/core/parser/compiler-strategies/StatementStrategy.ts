import { RuntimeBlock } from "@/core/runtime/parser/timer.runtime";
import { RuntimeStack } from "../RuntimeStack";
import { StatementNode, IRuntimeAction } from "../../runtime/types";
import { ICompilerStrategy } from "./CompoundStrategy";
import { SetDisplayAction } from "@/core/runtime/actions";

export class StatementStrategy implements ICompilerStrategy {
  apply(stack: StatementNode[], runtime: RuntimeStack): IRuntimeAction[] {
    // Safety check: Make sure we have a current node
    if (!stack || stack.length === 0) {
      return [];
    }

    const current = stack[0];
    
    // Safety check: Make sure current has fragments
    if (!current || !current.fragments) {
      return [];
    }
    
    if (current.fragments.length === 0 || current.children.length > 0) {
      return [];
    }
    
    // Create a RuntimeBlock instance
    const block = new RuntimeBlock(current, []);
    
    // Create a display update action
    const display = {
      elapsed: 0,
      state: "ready",
      label: current.type || "Exercise",
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
