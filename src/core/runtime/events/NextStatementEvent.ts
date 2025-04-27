import { IRuntimeEvent } from "@/core/timer.types";


export class NextStatementEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'next';
}
