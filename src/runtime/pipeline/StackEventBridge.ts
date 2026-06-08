import { OutputEmitter } from '../OutputEmitter';
import type { StackEvent, StackObserver, StackSnapshot } from '../contracts/IRuntimeStack';
import type { IRuntimeClock } from '../contracts/IRuntimeClock';

/**
 * Converts StackEvent notifications into StackSnapshot fan-out and output
 * emission. Owns the observer set so that subscribe/unsubscribe and
 * notification all live in one place.
 */
export class StackEventBridge {
  constructor(
    private readonly _output: OutputEmitter,
    private readonly _stackObservers: Set<StackObserver>,
    private readonly _clock: IRuntimeClock
  ) {}

  relay(event: StackEvent): void {
    if (event.type === 'pop') {
      this._output.emitSegmentFromResultMemory(event.block, event.depth, this._clock);
    }

    if (event.type === 'push' || event.type === 'pop') {
      this._output.emitStackEvent(event, event.blocks, this._clock);
    }

    if (this._stackObservers.size === 0) return;

    const snapshot: StackSnapshot = {
      type: event.type === 'initial' ? 'initial' : event.type,
      blocks: event.blocks,
      affectedBlock: event.type !== 'initial' ? event.block : undefined,
      depth: event.type === 'initial' ? event.blocks.length : event.depth,
      clockTime: this._clock.currentDate,
    };

    for (const observer of this._stackObservers) {
      try {
        observer(snapshot);
      } catch (err) {
        console.error('[RT] Stack observer error:', err);
      }
    }
  }

  notifySettled(blocks: readonly import('../contracts/IRuntimeBlock').IRuntimeBlock[]): void {
    if (this._stackObservers.size === 0) return;
    if (blocks.length === 0) return;

    const snapshot: StackSnapshot = {
      type: 'initial',
      blocks,
      depth: blocks.length,
      clockTime: this._clock.currentDate,
    };

    for (const observer of this._stackObservers) {
      try {
        observer(snapshot);
      } catch (err) {
        console.error('[RT] Stack observer error (settled):', err);
      }
    }
  }
}
