import { IRuntimeEvent, StatementNode, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { EventHandler } from "../EventHandler";
import { ResetEvent, GotoEvent, StartEvent } from "../timer.events";
import { RuntimeStack } from "../RuntimeStack";

export class RunHandler extends EventHandler {
  protected eventType: string = 'run';

  protected handleEvent(event: IRuntimeEvent, stack: RuntimeStack, runtime: ITimerRuntime): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    if (runtime.current?.type !== 'idle') {
      actions.push(new NotifyRuntimeAction(new ResetEvent(event.timestamp)));
    }

    actions.push(new NotifyRuntimeAction(new GotoEvent(event.timestamp, 0)));
    actions.push(new NotifyRuntimeAction(new StartEvent(event.timestamp)));

    return actions;
  }
}
