import { IRuntimeEvent } from "@/core/timer.types";

export class LapEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'lap';
}
