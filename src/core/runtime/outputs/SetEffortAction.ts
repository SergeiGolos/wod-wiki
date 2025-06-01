import { OutputEvent } from "@/core/OutputEvent";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { Subject } from "rxjs";
import { OutputAction } from "../OutputAction";

/**
 * Action to set the current effort/exercise information in the UI
 * This action is emitted when a block starts to display what exercise is being performed
 */
export class SetEffortAction extends OutputAction {
    constructor(private effort: string, private target: string = "primary") {
        super('SET_EFFORT');
    }

    write(_runtime: ITimerRuntime, _input: Subject<IRuntimeEvent>): OutputEvent[] {
        return [{
            eventType: this.eventType,
            bag: { 
                effort: this.effort,
                target: this.target
            },
            timestamp: new Date()
        }];
    }
}
