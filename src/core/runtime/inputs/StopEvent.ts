import { IRuntimeEvent } from "@/core/timer.types";

export class StopEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'stop';
}
