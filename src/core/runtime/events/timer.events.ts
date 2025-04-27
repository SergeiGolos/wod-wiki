import { IRuntimeEvent } from "../../timer.types";

// Runtime Execution
export class RunEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
      this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'run';
}
export class EndEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
      this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'end';
}
export class ResetEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'reset';
}

// Timers
export class StartEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
      this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'start';
}
export class StopEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'stop';
}
export class LapEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'lap';
}

export class CompleteEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
      this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'complete';
}








export class SoundEvent implements IRuntimeEvent {
    constructor(public sound: string,timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'sound';    
}

export class SaveEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'save';
}

export class NextStatementEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'next';
}
// Navigation
export class GotoEvent implements IRuntimeEvent {
    constructor(timestamp?: Date, blockId?: number) {
        this.timestamp = timestamp ?? new Date();
        this.blockId = blockId;
    }
    timestamp: Date;
    blockId?: number;
    name = 'next';
}


export class DisplayEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'display';
}
