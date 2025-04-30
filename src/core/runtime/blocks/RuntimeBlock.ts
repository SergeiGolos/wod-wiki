import { Duration, IActionButton, IDuration, IRuntimeAction, IRuntimeBlock, IRuntimeEvent, ITimerRuntime, ResultSpan, RuntimeMetric, StatementNode } from "@/core/timer.types";
import { EventHandler } from "../EventHandler";

export abstract class RuntimeBlock implements IRuntimeBlock {
  
  constructor(public blockId: number,
    public blockKey: string,
    public source?: StatementNode | undefined)
  {
  }
  
  public parent?: IRuntimeBlock | undefined;
  
  public laps: ResultSpan[] = []; 
  public metrics: RuntimeMetric[] = [];
  public buttons: IActionButton[] = [];

  public duration(): IDuration | undefined {
    // console.log("Method not implemented.");
    return undefined;
  }
  
  protected handlers: EventHandler[] = [];
  protected system: EventHandler[] = [];

  abstract next(runtime: ITimerRuntime): StatementNode | undefined;
  abstract load(runtime: ITimerRuntime): IRuntimeEvent[];

  public handle(runtime: ITimerRuntime, event: IRuntimeEvent): IRuntimeAction[] {
    const result: IRuntimeAction[] = [];
    for (const handler of [...this.system, ...this.handlers]) {
      const actions = handler.apply(event, runtime);
      for (const action of actions) {
        result.push(action);
      }
    }

    return result;
  }  
}