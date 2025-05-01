import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNode,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { startButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";

export class IdleRuntimeBlock extends RuntimeBlock implements IRuntimeBlock {
  constructor() {
    super("idle", -1, undefined);
    this.handlers = [
    ];
  }

  load(_runtime: ITimerRuntime): IRuntimeAction[] {
    //return [new SetButtonsAction([startButton], "system")];
    return []
  }

  /**
   * Returns the next statement to execute when transitioning from idle state
   * In an idle state, we want to start executing the first node in the script
   */
  next(runtime: ITimerRuntime): StatementNode | undefined {
    console.debug("IdleRuntimeBlock.next() - Transitioning from idle state");
    // Get the first node from the script stack if available
    if (runtime.script && runtime.script.nodes && runtime.script.nodes.length > 0) {
      console.debug("IdleRuntimeBlock.next() - Found first script node to execute");
      return runtime.script.nodes[0];
    }
    console.debug("IdleRuntimeBlock.next() - No script nodes found");
    return undefined;
  }
}
