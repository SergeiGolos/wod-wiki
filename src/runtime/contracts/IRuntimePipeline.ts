import type { IRuntimeBlock, BlockLifecycleOptions } from './IRuntimeBlock';
import type { IRuntimeAction } from './IRuntimeAction';
import type { StackEvent, StackObserver, Unsubscribe } from './IRuntimeStack';
import type { TrackerListener } from './IScriptRuntime';

export interface PushBlockResult {
  action: IRuntimeAction;
  afterPush(): void;
}

export interface PopBlockResult {
  action: IRuntimeAction;
  afterPop(): void;
}

/**
 * IRuntimePipeline owns the cross-cutting lifecycle choreography that
 * ScriptRuntime previously kept inline: stack-event bridging, tracker
 * subscription forwarding, push/pop hooks/wrapping/tracking, and settled
 * notifications.
 *
 * The pipeline is given stable references to the stack, clock, output emitter,
 * and runtime options at construction time. ScriptRuntime drives it by calling
 * preparePush / preparePop (receiving an action + a post-action callback) and
 * by delegating subscribeToStack / subscribeToTracker.
 */
export interface IRuntimePipeline {
  /**
   * Orchestrate the full push lifecycle and return the action to execute,
   * plus a callback that runs after the action (and any nested actions)
   * have completed.
   */
  preparePush(block: IRuntimeBlock, lifecycle?: BlockLifecycleOptions): PushBlockResult;

  /**
   * Orchestrate the full pop lifecycle and return the action to execute,
   * plus a callback that runs after the action (and any nested actions)
   * have completed.
   *
   * Returns undefined when the stack is empty (nothing to pop).
   */
  preparePop(lifecycle?: BlockLifecycleOptions): PopBlockResult | undefined;

  /** Bridge a raw StackEvent to StackSnapshot observers and the output emitter. */
  relayStackEvent(event: StackEvent): void;

  /** Notify observers that the current turn has settled. */
  notifySettled(): void;

  /** Subscribe to stack snapshots. */
  subscribeToStack(observer: StackObserver): Unsubscribe;

  /** Subscribe to real-time tracker updates. */
  subscribeToTracker(listener: TrackerListener): Unsubscribe;

  /** Dispose all pipeline resources (bridges, subscriptions, observer sets). */
  dispose(): void;
}
