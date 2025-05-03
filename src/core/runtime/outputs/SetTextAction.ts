import { IRuntimeEvent, ITimerRuntime, OutputEvent } from "@/core/timer.types";
import { OutputAction } from "../OutputAction";
import { Subject } from "rxjs";


export class SetTextAction extends OutputAction {
    constructor(private text: string, private target: string) {
        super('SET_TEXT');
    }

    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
        return [{
            eventType: this.eventType,
            bag: { text: this.text, target: this.target },
            timestamp: new Date()
        }];
    }
}
