import { IRuntimeAction } from "@/core/IRuntimeAction";
import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";

export class PopBlockAction implements IRuntimeAction {
  name: string = "pop";
  apply(
    runtime: ITimerRuntime,
    _input: Subject<IRuntimeEvent>,
    _output: Subject<OutputEvent>
  ): void {
    const poppedBlock = runtime.pop();
    
    // After popping a block, call next() on the current block to continue execution
    const currentBlock = runtime.trace.current();
    if (currentBlock && poppedBlock) {
      const nextActions = currentBlock.next(runtime);
      if (nextActions && nextActions.length > 0) {
        runtime.apply(nextActions, currentBlock);
      }
    }
  }
}