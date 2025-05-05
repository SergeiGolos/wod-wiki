import { IActionButton, IRuntimeEvent, ITimerRuntime, OutputEvent } from "@/core/timer.types";
import { OutputAction } from "../OutputAction";
import { Subject } from "rxjs";


export class SetButtonsAction extends OutputAction {
    constructor(private buttons: IActionButton[], private target: string) {
        super('SET_DISPLAY');
    }

    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
        return [{
            eventType: this.eventType,
            bag: { buttons: this.buttons, target: this.target },
            timestamp: new Date()
        }];
    }
}
