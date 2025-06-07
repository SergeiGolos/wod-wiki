import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventHandler } from "../EventHandler";
import { Duration, SpanDuration } from "@/core/Duration";
import { CompleteEvent } from "./CompleteEvent";
import { StartTimerAction } from "../actions/StartTimerAction";
import { StartEvent } from "./StartEvent";

import { SetButtonAction } from "../outputs/SetButtonAction";
import { skipButton } from "@/components/buttons/timerButtons";
import { SetSpanAction } from "../outputs/SetSpanAction";

export class RestRemainderHandler extends EventHandler {
    protected eventType: string = 'complete'; // This handler still listens for 'complete'

    protected handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
        if (!(event instanceof CompleteEvent)) {
            return [];
        }

        const block = runtime.trace.current();
        if (!block) {
            console.warn("RestRemainderHandler: No current block found.");
            return [];
        }

        const duration = block.duration;
        const actions: IRuntimeAction[] = [];

        // Check if this is a timer with remaining time
        if (duration !== undefined) {
            const spans = block.getSpanBuilder().Spans();
            const elapsed = new SpanDuration(spans ?? []);
            const remaining = new Duration(duration - (elapsed?.original ?? 0));

            // If there's remaining time, start a rest/recovery period
            if (remaining?.original !== undefined && remaining.original > 0) {
                console.log(`RestRemainderHandler: Starting rest period with ${remaining.original}ms remaining`);
                // Start a new ResultSpan for the rest period
                block.getSpanBuilder().Create(block, [{
                    effort: "rest",
                    sourceId: block.blockId,
                    values: []
                }]);
                block.getSpanBuilder().Start();

                // Continue timer countdown for the rest period
                actions.push(new StartTimerAction(new StartEvent(event.timestamp)));

                // Change UI state to rest/recovery mode
                actions.push(new SetTimerStateAction(TimerState.RUNNING_COUNTDOWN, "primary"));

                // Change button from "complete" to "skip"
                actions.push(new SetButtonAction("runtime", [skipButton]));
                actions.push(new SetSpanAction("primary", block.getSpanBuilder().Current()));

                return actions;
            }
        }
        
        // If no remaining time or not applicable, this handler does nothing
        return [];
    }
}
