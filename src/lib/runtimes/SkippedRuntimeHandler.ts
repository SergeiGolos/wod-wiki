import { IRuntimeAction } from "../IRuntimeAction";
import { IRuntimeHandler } from "../IRuntimeHandler";
import { TimerRuntime } from "../timer.runtime";


export class SkippedRuntimeHandler implements IRuntimeHandler {

  constructor() {
  }
  type: string = "statement";
  onTimerEvent(timestamp: Date, event: string, blocks?: TimerRuntime): IRuntimeAction[] {
    const block = blocks?.current[0];
    return [];
  }
}
