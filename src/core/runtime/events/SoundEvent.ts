import { IRuntimeEvent } from "@/core/timer.types";









export class SoundEvent implements IRuntimeEvent {
    constructor(public sound: string, timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'sound';
}
