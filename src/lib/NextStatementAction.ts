import { IRuntimeAction } from "./IRuntimeAction";
import { RuntimeBlock } from "./RuntimeBlock";
import { TimerRuntime } from "./timer.runtime";

export class RefreshStatementAction implements IRuntimeAction {
  constructor(public sourceId: number) { }
  apply(blocks: TimerRuntime): [RuntimeBlock | undefined, number] {    
    return blocks.current;
  }
}

export class NextStatementAction implements IRuntimeAction {
  constructor(public sourceId: number) { }
  
  apply(blocks: TimerRuntime): [RuntimeBlock | undefined, number] {    
    return blocks.goToNext();
  }
}
