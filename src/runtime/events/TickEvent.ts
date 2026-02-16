import { IEvent } from '../contracts/events/IEvent';

/**
 * Event emitted on each tick of the runtime clock (typically every ~20ms).
 * 
 * Behaviors subscribe to `'tick'` to receive periodic updates:
 * - `TimerTickBehavior` — updates timer elapsed time
 * - `TimerEndingBehavior` — checks if countdown has expired
 * - `SoundCueBehavior` — triggers countdown audio cues
 * 
 * Production entry point: `runtime.handle(new TickEvent())`
 */
export class TickEvent implements IEvent {
  readonly name: string = 'tick';
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
