import { IEvent } from './contracts/events/IEvent';

export class TickEvent implements IEvent {
  readonly name: string = 'timer:tick';
  readonly timestamp: Date;
  readonly data?: unknown;
  private static _counter = 0;

  constructor(data?: unknown) {
    const now = Date.now();
    TickEvent._counter++;
    this.timestamp = new Date(now + TickEvent._counter);
    this.data = data;
  }
}

export class NextEvent implements IEvent {
  readonly name: string = 'next';
  readonly timestamp: Date;
  private _data?: unknown;
  private static _counter = 0;

  constructor(data?: unknown) {
    // Ensure unique timestamp by using current time plus counter offset
    const now = Date.now();
    NextEvent._counter++;
    this.timestamp = new Date(now + NextEvent._counter);
    this._data = data;
  }

  get data(): unknown {
    return this._data;
  }

  set data(value: unknown) {
    this._data = value;
  }

  // Custom toJSON method for proper JSON serialization
  toJSON() {
    return {
      name: this.name,
      timestamp: this.timestamp,
      data: this._data
    };
  }
}