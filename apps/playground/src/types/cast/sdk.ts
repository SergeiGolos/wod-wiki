/**
 * Minimal structural model of the Google Cast Application Framework (CAF)
 * surface this app uses. The SDK ships no type declarations — these shapes
 * are derived from the calls in `ChromecastSdk.ts` and `CastSignaling.ts`
 * and are intentionally narrow. `string` is used in place of the SDK's
 * enum members because CAF exposes them as string constants at runtime.
 */

/** Message listener the CAF sender SDK invokes on a custom namespace. */
export interface CastMessageListener {
  (namespace: string, message: string): void;
}

/** Custom-namespace event dispatched to a receiver context listener. */
export interface CastCustomMessageEvent {
  readonly senderId: string;
  readonly data: unknown;
}

/** Receiver-side custom-message listener (CAF receiver SDK). */
export interface CastReceiverMessageListener {
  (event: CastCustomMessageEvent): void;
}

/** The CAF sender `CastSession` surface used by the signaling bridge. */
export interface SenderCastSessionLike {
  addMessageListener(namespace: string, listener: CastMessageListener): void;
  removeMessageListener(namespace: string, listener: CastMessageListener): void;
  sendMessage(namespace: string, message: unknown): Promise<unknown>;
  getSessionState?(): unknown;
  getSessionId?(): string | undefined;
  endSession?(stopCasting: boolean): void;
}

/** State-change event delivered by `CastContext.addEventListener`. */
export interface CastSessionStateChangedEvent {
  readonly sessionState: string;
}

/** The CAF sender `CastContext` surface used by `ChromecastSdk`. */
export interface CastContextLike {
  setOptions(options: {
    receiverApplicationId: string;
    autoJoinPolicy: string;
    resumeSavedSession: boolean;
  }): void;
  addEventListener(
    type: string,
    handler: (event: CastSessionStateChangedEvent) => void,
  ): void;
  requestSession(): Promise<unknown>;
  getCurrentSession(): SenderCastSessionLike | null;
}

/** The CAF receiver `CastReceiverContext` surface used by `ReceiverCastSignaling`. */
export interface CastReceiverContextLike {
  addCustomMessageListener(
    namespace: string,
    listener: CastReceiverMessageListener,
  ): void;
  removeCustomMessageListener?(
    namespace: string,
    listener: CastReceiverMessageListener,
  ): void;
  sendCustomMessage(
    namespace: string,
    senderId: string,
    message: unknown,
  ): void;
}