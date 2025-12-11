import { IEvent } from './IEvent';

export class TickEvent implements IEvent {
  readonly name: string = 'tick';
  readonly timestamp: Date;
  readonly data?: any;
  private static _counter = 0;

  constructor(data?: any) {
    const now = Date.now();
    TickEvent._counter++;
    this.timestamp = new Date(now + TickEvent._counter);
    this.data = data;
  }


export class NextEvent implements IEvent {
  readonly name: string = 'next';
  readonly timestamp: Date;
  private _data?: any;
  private static _counter = 0;

  constructor(data?: any) {
    // Ensure unique timestamp by using current time plus counter offset
    const now = Date.now();
    NextEvent._counter++;
    this.timestamp = new Date(now + NextEvent._counter);
    this._data = data;
  }

  get data(): any {
    return this._data;
  }

  set data(value: any) {
    this._data = value;
  }

  // Custom toJSON method for proper JSON serialization
  toJSON() {
    return {
      name: this._name,
      timestamp: this._timestamp,
      data: this._data
    };
  }
}