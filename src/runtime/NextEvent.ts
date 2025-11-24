import { IEvent } from './IEvent';

export class TickEvent implements IEvent {
  private _name = 'tick';
  private _timestamp: Date;
  private _data?: any;
  private static _counter = 0;

  constructor(data?: any) {
    const now = Date.now();
    TickEvent._counter++;
    this._timestamp = new Date(now + TickEvent._counter);
    this._data = data;
  }

  get name(): string {
    return this._name;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get data(): any {
    return this._data;
  }
}

export class NextEvent implements IEvent {
  private _name = 'next';
  private _timestamp: Date;
  private _data?: any;
  private static _counter = 0;

  constructor(data?: any) {
    // Ensure unique timestamp by using current time plus counter offset
    const now = Date.now();
    NextEvent._counter++;
    this._timestamp = new Date(now + NextEvent._counter);
    this._data = data;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    throw new Error('Cannot modify readonly property name');
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  set timestamp(value: Date) {
    throw new Error('Cannot modify readonly property timestamp');
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
