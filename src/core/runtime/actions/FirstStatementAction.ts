import { IRuntimeAction, ITimerRuntime, RuntimeEvent } from "@/core/timer.types";


export class FirstStatementAction implements IRuntimeAction {
  constructor() { }
  apply(runtime: ITimerRuntime): RuntimeEvent[] {    
    runtime.reset();
    
    const block = runtime.script.nodes[0];                
    if (block) {
      runtime.gotoBlock(block);
    }
    return [];
  }
}