import { IActionButton } from "@/core/timer.types";
import { OutputAction } from "../OutputAction";


export class SetButtonsAction extends OutputAction {
    constructor(buttons: IActionButton[], target: string) {
        super('SET_DISPLAY', { buttons, target });
    }
}
