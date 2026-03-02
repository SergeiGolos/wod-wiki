/**
 * CastSignaling.ts
 *
 * Signaling adapter that exchanges WebRTC SDP offers/answers and ICE candidates
 * through the Google Cast SDK custom message namespace.
 *
 * Two concrete implementations:
 *
 *  • `SenderCastSignaling`   — wraps a CAF sender `CastSession`
 *  • `ReceiverCastSignaling` — wraps a CAF `CastReceiverContext`
 *
 * Both implement `ISignaling` from WebRTCTransport.ts so they can be plugged
 * directly into `new WebRTCTransport(role, signaling)`.
 */

import { CAST_NAMESPACE } from '@/types/cast/messages';
import type { WebRTCSignalMessage } from '@/types/cast/messages';
import type { ISignaling } from './WebRTCTransport';

// ── Sender-side signaling (runs in the web app) ────────────────────────────

/**
 * Uses `CastSession.sendMessage()` / `addMessageListener()` to exchange
 * WebRTC signaling payloads with the receiver over the Cast message bus.
 */
export class SenderCastSignaling implements ISignaling {
  private handler: ((signal: WebRTCSignalMessage) => void) | null = null;
  private boundListener: ((namespace: string, message: string) => void) | null = null;

  /**
   * @param session  The active CastSession from `CastContext.getCurrentSession()`.
   *                 Must be in SESSION_STARTED state.
   */
  constructor(private readonly session: any /* cast.framework.CastSession */) {
    this.boundListener = (_namespace: string, message: string) => {
      try {
        const signal = JSON.parse(message) as WebRTCSignalMessage;
        this.handler?.(signal);
      } catch (err) {
        console.error('[SenderCastSignaling] Failed to parse incoming signal', err);
      }
    };

    this.session.addMessageListener(CAST_NAMESPACE, this.boundListener);
    console.log(`[SenderCastSignaling] Listening on ${CAST_NAMESPACE}`);
  }

  send(signal: WebRTCSignalMessage): void {
    this.session
      .sendMessage(CAST_NAMESPACE, JSON.stringify(signal))
      .catch((err: unknown) =>
        console.error('[SenderCastSignaling] sendMessage failed', err)
      );
  }

  onSignal(handler: (signal: WebRTCSignalMessage) => void): void {
    this.handler = handler;
  }

  dispose(): void {
    if (this.boundListener) {
      try {
        this.session.removeMessageListener(CAST_NAMESPACE, this.boundListener);
      } catch { /* session may already be gone */ }
      this.boundListener = null;
    }
    this.handler = null;
  }
}

// ── Receiver-side signaling (runs on the Chromecast) ────────────────────────

/**
 * Uses the CAF Receiver SDK's `CastReceiverContext` to receive signaling
 * messages from the sender and respond back.
 */
export class ReceiverCastSignaling implements ISignaling {
  private handler: ((signal: WebRTCSignalMessage) => void) | null = null;
  private senderId: string | null = null;
  private boundListener: ((event: any) => void) | null = null;

  /**
   * @param context  `cast.framework.CastReceiverContext.getInstance()`
   */
  constructor(private readonly context: any /* cast.framework.CastReceiverContext */) {
    this.boundListener = (event: any) => {
      try {
        // Remember the sender's ID so we can reply
        this.senderId = event.senderId;
        const signal = (typeof event.data === 'string'
          ? JSON.parse(event.data)
          : event.data) as WebRTCSignalMessage;
        this.handler?.(signal);
      } catch (err) {
        console.error('[ReceiverCastSignaling] Failed to parse incoming signal', err);
      }
    };

    this.context.addCustomMessageListener(CAST_NAMESPACE, this.boundListener);
    console.log(`[ReceiverCastSignaling] Listening on ${CAST_NAMESPACE}`);
  }

  send(signal: WebRTCSignalMessage): void {
    if (!this.senderId) {
      console.warn('[ReceiverCastSignaling] No senderId yet — cannot reply');
      return;
    }
    this.context.sendCustomMessage(
      CAST_NAMESPACE,
      this.senderId,
      JSON.stringify(signal),
    );
  }

  onSignal(handler: (signal: WebRTCSignalMessage) => void): void {
    this.handler = handler;
  }

  dispose(): void {
    // The CAF receiver SDK doesn't expose removeCustomMessageListener in all
    // versions, so we guard the call.
    if (this.boundListener && typeof this.context.removeCustomMessageListener === 'function') {
      try {
        this.context.removeCustomMessageListener(CAST_NAMESPACE, this.boundListener);
      } catch { /* ignore */ }
    }
    this.boundListener = null;
    this.handler = null;
  }
}
