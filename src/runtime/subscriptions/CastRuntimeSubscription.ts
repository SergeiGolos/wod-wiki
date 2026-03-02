import type {
  IRuntimeSubscription,
  ISubscribableRuntime,
} from '../contracts/IRuntimeSubscription';
import type { StackSnapshot } from '../contracts/IRuntimeStack';
import type { IOutputStatement } from '../../core/models/OutputStatement';

/**
 * Serialisable snapshot sent over the WebRTC transport.
 * Mirrors the `state-update` payload expected by the receiver.
 */
export interface CastStatePayload {
  type: 'state-update';
  snapshot: {
    type: StackSnapshot['type'];
    depth: number;
    clockTime: number;
    blockKeys: string[];
    affectedBlockKey?: string;
  };
}

export interface CastOutputPayload {
  type: 'output-update';
  output: {
    id: number;
    outputType: string;
    sourceBlockKey: string;
    stackLevel: number;
    fragmentCount: number;
  };
}

/**
 * Minimal transport interface for sending messages to the Chromecast.
 * Matches the public API of `WebRTCTransport` without importing it directly.
 */
export interface ICastTransport {
  send(message: unknown): void;
  readonly isConnected: boolean;
}

/**
 * Runtime subscription that forwards stack and output events over a
 * `ICastTransport` (typically WebRTC DataChannel) to the Chromecast receiver.
 *
 * Created when the user clicks the Cast button and a WebRTC connection is
 * established.  Disposed when the cast session ends.
 */
export class CastRuntimeSubscription implements IRuntimeSubscription {
  public readonly id: string;
  private _isAttached = false;
  private _unsubStack: (() => void) | null = null;
  private _unsubOutput: (() => void) | null = null;

  constructor(
    private readonly transport: ICastTransport,
    sessionId: string,
  ) {
    this.id = `cast-${sessionId}`;
  }

  get isAttached(): boolean {
    return this._isAttached;
  }

  attach(runtime: ISubscribableRuntime): void {
    if (this._isAttached) {
      this.detach();
    }

    this._unsubStack = runtime.subscribeToStack((snapshot: StackSnapshot) => {
      if (!this.transport.isConnected) return;

      const payload: CastStatePayload = {
        type: 'state-update',
        snapshot: {
          type: snapshot.type,
          depth: snapshot.depth,
          clockTime: snapshot.clockTime.getTime(),
          blockKeys: snapshot.blocks.map(b => b.key.toString()),
          affectedBlockKey: snapshot.affectedBlock?.key.toString(),
        },
      };
      this.transport.send(payload);
    });

    this._unsubOutput = runtime.subscribeToOutput((output: IOutputStatement) => {
      if (!this.transport.isConnected) return;

      const payload: CastOutputPayload = {
        type: 'output-update',
        output: {
          id: output.id,
          outputType: output.outputType,
          sourceBlockKey: output.sourceBlockKey,
          stackLevel: output.stackLevel,
          fragmentCount: output.fragments.length,
        },
      };
      this.transport.send(payload);
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
  }
}
