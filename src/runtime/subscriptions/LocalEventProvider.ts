import type {
  IRuntimeEventProvider,
  IEventReceivingRuntime,
} from '../contracts/IRuntimeEventProvider';

/**
 * Local event provider that forwards UI events directly to the runtime
 * via `runtime.handle()`.
 *
 * This is the default provider for the browser workbench.
 */
export class LocalEventProvider implements IRuntimeEventProvider {
  public readonly id: string;
  private _runtime: IEventReceivingRuntime | null = null;

  constructor(id = 'local') {
    this.id = id;
  }

  get isConnected(): boolean {
    return this._runtime !== null;
  }

  connect(runtime: IEventReceivingRuntime): void {
    this._runtime = runtime;
  }

  disconnect(): void {
    this._runtime = null;
  }

  /**
   * Inject an event into the connected runtime.
   *
   * @param name Event name (e.g. 'next', 'start', 'pause', 'stop')
   * @param data Optional event payload
   */
  sendEvent(name: string, data?: unknown): void {
    if (!this._runtime) {
      console.warn(`[LocalEventProvider:${this.id}] Not connected — dropping event "${name}"`);
      return;
    }
    this._runtime.handle({ name, timestamp: new Date(), data });
  }

  dispose(): void {
    this.disconnect();
  }
}
