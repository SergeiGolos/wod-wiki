import type { StackSnapshot, StackObserver, Unsubscribe } from '../contracts/IRuntimeStack';
import type { OutputListener } from '../contracts/IScriptRuntime';
import type { ISubscribableRuntime } from '../contracts/IRuntimeSubscription';
import { OutputStatement, type IOutputStatement } from '../../core/models/OutputStatement';
import { TimeSpan } from '../models/TimeSpan';

/**
 * Minimal transport interface for the receiver side.
 */
export interface IRPCTransport {
  on(event: 'message', handler: (data: unknown) => void): () => void;
  off(event: 'message', handler: (data: unknown) => void): void;
  send(message: unknown): void;
  readonly isConnected: boolean;
}

/**
 * ChromeCastRPCRuntime — an `ISubscribableRuntime` implementation that runs
 * on the Chromecast receiver device.
 *
 * Instead of performing actual engine processing, it consumes RPC messages
 * from the sender browser over the WebRTC DataChannel and exposes them
 * through the standard subscription API (`subscribeToStack`, `subscribeToOutput`).
 *
 * This allows the Chromecast workbench to use a `LocalRuntimeSubscription`
 * to bind to this proxy runtime, giving the same visual feel as the browser.
 *
 * Events from the Chromecast remote (D-Pad) are forwarded back to the
 * sender via `transport.send()`.
 */
export class ChromeCastRPCRuntime implements ISubscribableRuntime {
  private readonly _stackObservers = new Set<StackObserver>();
  private readonly _outputListeners = new Set<OutputListener>();
  private readonly _outputs: IOutputStatement[] = [];
  private _messageHandler: ((data: unknown) => void) | null = null;
  private _disposed = false;

  constructor(private readonly transport: IRPCTransport) {
    this._messageHandler = (data: unknown) => {
      this.handleMessage(data);
    };
    this.transport.on('message', this._messageHandler);
  }

  /**
   * Subscribe to stack snapshots received from the sender.
   */
  subscribeToStack(observer: StackObserver): Unsubscribe {
    this._stackObservers.add(observer);
    return () => { this._stackObservers.delete(observer); };
  }

  /**
   * Subscribe to output statements received from the sender.
   */
  subscribeToOutput(listener: OutputListener): Unsubscribe {
    this._outputListeners.add(listener);
    return () => { this._outputListeners.delete(listener); };
  }

  /**
   * Get all output statements received so far.
   */
  getOutputStatements(): IOutputStatement[] {
    return [...this._outputs];
  }

  /**
   * Send an event back to the sender browser (e.g. D-Pad next/start/pause/stop).
   */
  sendEvent(name: string, data?: unknown): void {
    if (!this.transport.isConnected) {
      console.warn(`[ChromeCastRPCRuntime] Transport not connected — dropping event "${name}"`);
      return;
    }
    this.transport.send({
      type: 'event-from-receiver',
      messageId: `rpc-${Date.now()}`,
      timestamp: Date.now(),
      payload: {
        event: {
          name,
          timestamp: Date.now(),
          data,
        },
      },
    });
  }

  /**
   * Clean up transport listener and clear all observers.
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    if (this._messageHandler) {
      this.transport.off('message', this._messageHandler);
      this._messageHandler = null;
    }
    this._stackObservers.clear();
    this._outputListeners.clear();
    this._outputs.length = 0;
  }

  // ── Internal message handling ──────────────────────────────────────────

  private handleMessage(data: unknown): void {
    const msg = data as { type?: string; [key: string]: unknown };
    if (!msg || typeof msg.type !== 'string') return;

    switch (msg.type) {
      case 'state-update':
        this.handleStackUpdate(msg);
        break;
      case 'output-update':
        this.handleOutputUpdate(msg);
        break;
    }
  }

  private handleStackUpdate(msg: Record<string, unknown>): void {
    const snap = msg.snapshot as {
      type?: string;
      depth?: number;
      clockTime?: number;
      blockKeys?: string[];
      affectedBlockKey?: string;
    } | undefined;

    if (!snap) return;

    const snapshot: StackSnapshot = {
      type: (snap.type as StackSnapshot['type']) ?? 'initial',
      blocks: [], // Receiver doesn't have real block objects
      depth: snap.depth ?? 0,
      clockTime: new Date(snap.clockTime ?? Date.now()),
    };

    for (const observer of this._stackObservers) {
      try { observer(snapshot); } catch (e) { console.error('[ChromeCastRPCRuntime] observer error:', e); }
    }
  }

  private handleOutputUpdate(msg: Record<string, unknown>): void {
    const outputData = msg.output as {
      id?: number;
      outputType?: string;
      sourceBlockKey?: string;
      stackLevel?: number;
      fragmentCount?: number;
    } | undefined;

    if (!outputData) return;

    // Build a minimal OutputStatement from the received data
    const now = Date.now();
    const output = new OutputStatement({
      outputType: (outputData.outputType ?? 'system') as 'system',
      timeSpan: new TimeSpan(now, now),
      sourceBlockKey: outputData.sourceBlockKey ?? '',
      stackLevel: outputData.stackLevel ?? 0,
      fragments: [],
    });

    this._outputs.push(output);

    for (const listener of this._outputListeners) {
      try { listener(output); } catch (e) { console.error('[ChromeCastRPCRuntime] listener error:', e); }
    }
  }
}
