import { IRuntimeEvent } from "../EventHandler";

export class NextStatementEvent implements IRuntimeEvent {
    public readonly name = 'next';
    public readonly timestamp: Date;
    public readonly blockId?: number;

    constructor(timestamp: Date = new Date(), blockId?: number) {
        this.timestamp = timestamp;
        this.blockId = blockId;
    }
}
