import { IRuntimeAction, TimerDisplay, ButtonConfig, WodResultBlock } from "@/core/timer.types";
import { TimerRuntime } from "@/core/runtime/timer.runtime";

export class NextChildStatementAction implements IRuntimeAction {
  constructor(public blockId: number) { }
  
  apply(
    runtime: TimerRuntime,
    setDisplay: (display: TimerDisplay) => void,
    setButtons: (buttons: ButtonConfig[]) => void,
    setResults: (results: WodResultBlock[]) => void
  ): void {    
    const blocks = runtime.script.leafs;    
    const block = blocks.find(block => block.id === this.blockId); 

    if (block) {
      runtime.gotoBlock(block);      
    }
  }
}
