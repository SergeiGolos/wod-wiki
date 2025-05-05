import {
  IRuntimeAction,
  IRuntimeBlock,
  IRuntimeEvent,
  ITimerRuntime,
  ITimeSpan,
  StatementNodeDetail,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";

export abstract class RuntimeBlock implements IRuntimeBlock {  
  constructor(
    // meta
    public source: StatementNodeDetail
  ) {
    this.blockId = source.id;
  }
  public blockKey?: string | undefined;
  // meta
  public parent?: IRuntimeBlock | undefined;    
  public blockId: number;
   // stat
  public index: number = 0;
  public spans: ITimeSpan[] = [];
    
  // Runtime
  protected handlers: EventHandler[] = [];  
  abstract enter(runtime: ITimerRuntime): IRuntimeAction[] ;
  abstract next(runtime: ITimerRuntime): IRuntimeAction[];    
  abstract leave(runtime: ITimerRuntime): IRuntimeAction[] ;  
  
  public handle(
    runtime: ITimerRuntime,
    event: IRuntimeEvent,
    system: EventHandler[]
  ): IRuntimeAction[] {
    const result: IRuntimeAction[] = [];
    for (const handler of [...system, ...this.handlers]) {
      const actions = handler.apply(event, runtime);
      for (const action of actions) {
        result.push(action);
      }
    }

    return result;
  }
}
