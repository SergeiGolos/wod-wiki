import { IRuntimeEvent } from "@/core/timer.types";


export class SaveEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'save';
}
