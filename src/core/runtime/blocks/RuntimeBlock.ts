import {
  IRuntimeAction,
  IRuntimeBlock,
  IRuntimeEvent,
  ITimerRuntime,
  ITimeSpan,
  StatementNode,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";

export abstract class RuntimeBlock implements IRuntimeBlock {
  protected runtimeIndex: number = 0;
  constructor(
    public blockKey: string,
    public blockId: number,
    public source?: StatementNode | undefined
  ) {}

  public parent?: IRuntimeBlock | undefined;  
  public laps: ITimeSpan[] = [];
  protected handlers: EventHandler[] = [];
  abstract next(runtime: ITimerRuntime): StatementNode | undefined;
  abstract load(runtime: ITimerRuntime): IRuntimeAction[];

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
