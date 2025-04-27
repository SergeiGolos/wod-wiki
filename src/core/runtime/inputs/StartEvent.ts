import { IRuntimeEvent } from "@/core/timer.types";

// Timers

export class StartEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'start';
}
