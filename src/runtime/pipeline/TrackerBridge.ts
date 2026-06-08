import type { TrackerListener } from '../contracts/IScriptRuntime';
import type { RuntimeStackTracker, TrackerUpdate } from '../contracts/IRuntimeOptions';
import type { Unsubscribe } from '../contracts/IRuntimeStack';

/**
 * Bridges tracker updates from the runtime's tracker (if any) to a local
 * listener set. Manages the subscription lifecycle so that the first
 * subscribe() call wires up the tracker and the last unsubscribe() tears
 * it down.
 */
export class TrackerBridge {
  private readonly _listeners = new Set<TrackerListener>();
  private _subscriptionUnsub: (() => void) | null = null;

  constructor(private readonly _tracker: RuntimeStackTracker | undefined) {}

  subscribe(listener: TrackerListener): Unsubscribe {
    this._listeners.add(listener);

    if (this._listeners.size === 1 && this._tracker?.onUpdate) {
      this._subscriptionUnsub = this._tracker.onUpdate((update: TrackerUpdate) => {
        for (const l of this._listeners) {
          try {
            l(update);
          } catch (err) {
            console.error('[RT] Tracker listener error:', err);
          }
        }
      });
    }

    return () => {
      this._listeners.delete(listener);
      if (this._listeners.size === 0 && this._subscriptionUnsub) {
        this._subscriptionUnsub();
        this._subscriptionUnsub = null;
      }
    };
  }

  dispose(): void {
    this._listeners.clear();
    if (this._subscriptionUnsub) {
      this._subscriptionUnsub();
      this._subscriptionUnsub = null;
    }
  }
}
