import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { TimedGroupBlock } from "../TimedGroupBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";


export class GroupCountdownStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: JitStatement[]): boolean {
    // Only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }

    const node = nodes[0];
    const increment = node.increments();
    const duration = node.durations();
    const rounds = node.rounds();
    const hasChildren = node.children.length > 0;

    // Handle countdown nodes with negative duration, no rounds, and children
    return (duration.length > 0 &&
      increment.length > 0 && increment[0].image === "-" &&
      rounds.length === 0 &&
      hasChildren);
  }

  compile(
    nodes: JitStatement[],
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    // Only handle the array if it contains exactly one node
    if (nodes.length !== 1) {
      console.warn('TimedRepeaterBlockStrategy: Expected array with exactly one node');
      return undefined;
    }

    // Use the first (and only) node for compatibility with existing implementation
    return new TimedGroupBlock(nodes[0]);
  }
}
