import { StackSnapshot } from './IRuntimeStack';
import { IOutputStatement } from '../../core/models/OutputStatement';

/**
 * Callback for stack snapshot events from a runtime subscription.
 */
export type SubscriptionStackHandler = (snapshot: StackSnapshot) => void;

/**
 * Callback for output statement events from a runtime subscription.
 */
export type SubscriptionOutputHandler = (output: IOutputStatement) => void;

/**
 * Contract for subscribing to runtime updates (stack changes and output statements).
 *
 * Implementations include:
 * - **LocalRuntimeSubscription**: binds directly to IScriptRuntime subscription APIs
 *   and updates the local workbench UI.
 * - **CastRuntimeSubscription**: forwards stack/output updates over a WebRTC transport
 *   to the Chromecast receiver.
 *
 * Multiple subscriptions can be registered simultaneously. Adding a Chromecast
 * subscription does not interfere with the local subscription.
 */
export interface IRuntimeSubscription {
  /** Unique identifier for this subscription (e.g. 'local', 'cast-<sessionId>'). */
  readonly id: string;

  /** Whether this subscription is currently attached to a runtime. */
  readonly isAttached: boolean;

  /**
   * Attach this subscription to a runtime. Begins forwarding stack and output
   * events from the runtime to the subscription's handlers.
   *
   * @param runtime The runtime to subscribe to — duck-typed to avoid circular imports.
   */
  attach(runtime: ISubscribableRuntime): void;

  /**
   * Detach from the currently attached runtime. Stops forwarding events.
   */
  detach(): void;

  /**
   * Permanently dispose of the subscription and release all resources.
   */
  dispose(): void;
}

/**
 * Minimal duck-typed interface for the subscription methods on IScriptRuntime.
 * Avoids importing the full IScriptRuntime to prevent circular dependencies.
 */
export interface ISubscribableRuntime {
  subscribeToStack(observer: SubscriptionStackHandler): () => void;
  subscribeToOutput(listener: SubscriptionOutputHandler): () => void;
  getOutputStatements(): IOutputStatement[];
}
