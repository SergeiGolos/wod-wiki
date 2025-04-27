import { IRuntimeEvent } from "@/core/timer.types";

export class EndEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'end';
}
