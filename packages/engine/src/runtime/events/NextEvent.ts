import { IEvent } from '../contracts/events/IEvent';
import { INowProvider, wallClockNow } from '../INowProvider';

export class NextEvent implements IEvent {
  readonly name: string = 'next';
  readonly timestamp: Date;
  private _data?: unknown;
  private static _counter = 0;
  constructor(data?: unknown, private readonly now: INowProvider = wallClockNow) {
    // Ensure unique timestamp by using current time plus counter offset
    const nowMs = this.now.nowMs();
    NextEvent._counter++;
    this.timestamp = new Date(nowMs + NextEvent._counter);
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
