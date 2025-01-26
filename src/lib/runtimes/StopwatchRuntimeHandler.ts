import { IRuntimeAction } from "../IRuntimeAction";
import { IRuntimeHandler } from "../IRuntimeHandler";
import { NextStatementAction } from "./NextStatementAction";
import { TimerRuntime } from "../timer.runtime";


export class StopwatchRuntimeHandler implements IRuntimeHandler {
  constructor() {
  }
  type: string = "statement";
  onTimerEvent(timestamp: Date, event: string, blocks?: TimerRuntime): IRuntimeAction[] {
    const block = blocks?.current[0];
    if (!block) {
      throw new Error("Method not implemented.");
    }
    switch (event) {
      case "started":
        blocks.push("start");
        return [];

      case "lap":
        blocks.push("lap");
        return [];

      case "stop":
        blocks.push("stop");
        return [];

      case "completed":
        return [ new NextStatementAction(block.id) ];

      default:
        return [];
    }
  }
}
