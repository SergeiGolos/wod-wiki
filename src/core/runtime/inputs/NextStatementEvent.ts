import { IRuntimeEvent } from "@/core/timer.types";

// Navigation
export class NextStatementEvent implements IRuntimeEvent {
    constructor(timestamp?: Date, blockId?: number) {
        this.timestamp = timestamp ?? new Date();
        this.blockId = blockId;
    }
    timestamp: Date;
    blockId?: number;
    name = 'next';
}
