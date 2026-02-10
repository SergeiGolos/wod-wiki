import { IEvent } from '../contracts/events/IEvent';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';

/**
 * Base class for stack events containing the current stack state.
 */
abstract class BaseStackEvent implements IEvent {
  abstract readonly name: string;
  readonly timestamp: Date;
  readonly data: { blocks: readonly IRuntimeBlock[] };

  constructor(blocks: readonly IRuntimeBlock[]) {
    this.timestamp = new Date();
    this.data = { blocks };
  }
}

/**
 * Event dispatched after a block is pushed onto the stack.
 */
export class StackPushEvent extends BaseStackEvent {
  readonly name = 'stack:push';

  constructor(blocks: readonly IRuntimeBlock[]) {
    super(blocks);
  }
}

/**
 * Event dispatched after a block is popped from the stack.
 */
export class StackPopEvent extends BaseStackEvent {
  readonly name = 'stack:pop';

  constructor(blocks: readonly IRuntimeBlock[]) {
    super(blocks);
  }
}

/**
 * Event dispatched after the stack is cleared.
 */
export class StackClearEvent extends BaseStackEvent {
  readonly name = 'stack:clear';

  constructor(blocks: readonly IRuntimeBlock[]) {
    super(blocks);
  }
}
