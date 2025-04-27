import { IRuntimeEvent, ISpanDuration } from "@/core/timer.types";



export class DisplayEvent implements IRuntimeEvent {
    constructor(public target:string, public span: ISpanDuration) {        
        this.timestamp = new Date();
    }    
    timestamp: Date;
    name = 'display';
}
