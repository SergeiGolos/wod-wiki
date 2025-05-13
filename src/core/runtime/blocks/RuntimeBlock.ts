import {
  IRuntimeAction,
  IRuntimeBlock,
  IRuntimeEvent,
  ITimerRuntime,
  ITimeSpan,
  PrecompiledNode,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";

export abstract class RuntimeBlock implements IRuntimeBlock {  
  constructor(
    // meta
    public sources: PrecompiledNode[]
  ) {
    this.blockId = sources.map(s => s.id).join(":") || "";
  }
  public blockKey?: string | undefined;
  // meta
  public parent?: IRuntimeBlock | undefined;    
  public blockId: string;
   // stat
  public index: number = 0;
  public spans: ITimeSpan[] = [];
 


  // Runtime
  protected handlers: EventHandler[] = [];  
  abstract enter(runtime: ITimerRuntime): IRuntimeAction[] ;
  abstract next(runtime: ITimerRuntime): IRuntimeAction[];    
  abstract leave(runtime: ITimerRuntime): IRuntimeAction[] ;  
  

  public get<T>(fn: (node:  PrecompiledNode) => T[], recursive?: boolean): T[] {
    let block: IRuntimeBlock = this;
    let result: T[] = block.sources?.flatMap(fn) ?? [];
    while (recursive && block.parent) {
      block = block.parent;
      result.push(...block.sources?.flatMap(fn) ?? []);
    }
    
    return result;
  }

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
