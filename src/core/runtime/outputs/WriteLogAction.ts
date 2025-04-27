import { IRuntimeLog } from "@/core/timer.types";
import { OutputAction } from "../OutputAction";


export class WriteLogAction extends OutputAction {
    constructor(log: IRuntimeLog) {
        super('WRITE_LOG', { log });
    }
}
