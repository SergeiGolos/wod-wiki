import { IEvent } from '../contracts/events/IEvent';
import { IMemoryReference } from '../contracts/IMemoryReference';

/**
 * Base class for memory events.
 */
abstract class BaseMemoryEvent implements IEvent {
  abstract readonly name: string;
  readonly timestamp: Date;

  constructor() {
    this.timestamp = new Date();
  }
}

/**
 * Event dispatched when a memory location is allocated.
 */
export class MemoryAllocateEvent extends BaseMemoryEvent {
  readonly name = 'memory:allocate';
  readonly data: {
    ref: IMemoryReference;
    value: unknown;
  };

  constructor(ref: IMemoryReference, value: unknown) {
    super();
    this.data = { ref, value };
  }
}

/**
 * Event dispatched when a memory value is set/updated.
 */
export class MemorySetEvent extends BaseMemoryEvent {
  readonly name = 'memory:set';
  readonly data: {
    ref: IMemoryReference;
    value: unknown;
    oldValue: unknown;
  };

  constructor(ref: IMemoryReference, value: unknown, oldValue: unknown) {
    super();
    this.data = { ref, value, oldValue };
  }
}

/**
 * Event dispatched when a memory location is released.
 */
export class MemoryReleaseEvent extends BaseMemoryEvent {
  readonly name = 'memory:release';
  readonly data: {
    ref: IMemoryReference;
    lastValue: unknown;
  };

  constructor(ref: IMemoryReference, lastValue: unknown) {
    super();
    this.data = { ref, lastValue };
  }
}
