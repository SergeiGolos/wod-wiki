import type {
  IRuntimeSubscription,
  ISubscribableRuntime,
  SubscriptionStackHandler,
  SubscriptionOutputHandler,
} from '../contracts/IRuntimeSubscription';
import type { StackSnapshot } from '../contracts/IRuntimeStack';
import type { IOutputStatement } from '../../core/models/OutputStatement';

/**
 * Local runtime subscription that binds directly to `IScriptRuntime`
 * subscription APIs and forwards stack/output events to caller-provided
 * callbacks.
 *
 * This is the default subscription used by the browser workbench UI.
 */
export class LocalRuntimeSubscription implements IRuntimeSubscription {
  public readonly id: string;
  private _isAttached = false;
  private _unsubStack: (() => void) | null = null;
  private _unsubOutput: (() => void) | null = null;

  private readonly _stackHandlers = new Set<SubscriptionStackHandler>();
  private readonly _outputHandlers = new Set<SubscriptionOutputHandler>();

  constructor(id = 'local') {
    this.id = id;
  }

  get isAttached(): boolean {
    return this._isAttached;
  }

  /**
   * Register a callback to receive stack snapshot events.
   * Returns an unsubscribe function.
   */
  onStack(handler: SubscriptionStackHandler): () => void {
    this._stackHandlers.add(handler);
    return () => { this._stackHandlers.delete(handler); };
  }

  /**
   * Register a callback to receive output statement events.
   * Returns an unsubscribe function.
   */
  onOutput(handler: SubscriptionOutputHandler): () => void {
    this._outputHandlers.add(handler);
    return () => { this._outputHandlers.delete(handler); };
  }

  attach(runtime: ISubscribableRuntime): void {
    if (this._isAttached) {
      this.detach();
    }

    this._unsubStack = runtime.subscribeToStack((snapshot: StackSnapshot) => {
      for (const h of this._stackHandlers) {
        try { h(snapshot); } catch (e) { console.error(`[LocalSubscription:${this.id}] stack handler error:`, e); }
      }
    });

    this._unsubOutput = runtime.subscribeToOutput((output: IOutputStatement) => {
      for (const h of this._outputHandlers) {
        try { h(output); } catch (e) { console.error(`[LocalSubscription:${this.id}] output handler error:`, e); }
      }
    });

    this._isAttached = true;
  }

  detach(): void {
    this._unsubStack?.();
    this._unsubStack = null;
    this._unsubOutput?.();
    this._unsubOutput = null;
    this._isAttached = false;
  }

  dispose(): void {
    this.detach();
    this._stackHandlers.clear();
    this._outputHandlers.clear();
  }
}
