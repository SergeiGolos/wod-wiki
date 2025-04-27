import { ChromecastEventType } from "@/cast";
import { OutputEvent } from "@/cast/types/chromecast-events";
import { IRuntimeAction, ITimerRuntime, IRuntimeEvent } from "@/core/timer.types";
import { Subject } from "rxjs";


export abstract class OutputAction implements IRuntimeAction {
    name: string = 'output';
    apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>) {
        output.next({
            eventType: ChromecastEventType.Output,
            bag: {},
            timestamp: new Date()
        });
    }
}
