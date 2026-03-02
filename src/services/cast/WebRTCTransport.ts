/**
 * WebRTCTransport.ts
 *
 * Peer-to-peer data transport using RTCDataChannel.  Replaces the WebSocket
 * relay for all cast protocol messages (state-update, event-from-receiver, …).
 *
 * Signaling (SDP offer/answer + ICE candidates) is exchanged out-of-band via
 * the `ISignaling` interface — typically backed by the Cast SDK custom
 * message namespace (see CastSignaling.ts).
 *
 * Usage — Sender (offerer):
 *   const transport = new WebRTCTransport('offerer', signaling);
 *   await transport.connect();           // creates offer, waits for answer
 *   transport.send(stateUpdateMessage);  // JSON over DataChannel
 *
 * Usage — Receiver (answerer):
 *   const transport = new WebRTCTransport('answerer', signaling);
 *   await transport.connect();           // waits for offer, creates answer
 *   transport.on('message', handler);    // incoming messages
 */

import type { WebRTCSignalMessage } from '@/types/cast/messages';

// ── Public interface for signaling adapters ─────────────────────────────────

export interface ISignaling {
  /** Send an SDP/ICE signal to the remote peer. */
  send(signal: WebRTCSignalMessage): void;

  /** Register the handler that receives signals from the remote peer. */
  onSignal(handler: (signal: WebRTCSignalMessage) => void): void;

  /** Clean up listeners. */
  dispose(): void;
}

// ── Event types ─────────────────────────────────────────────────────────────

type TransportEventMap = {
  message: (data: unknown) => void;
  connected: () => void;
  disconnected: () => void;
  error: (err: unknown) => void;
};

type TransportEvent = keyof TransportEventMap;

// ── Transport ───────────────────────────────────────────────────────────────

export class WebRTCTransport {
  private pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private listeners = new Map<TransportEvent, Array<(...args: unknown[]) => void>>();
  private disposed = false;

  /**
   * @param role     'offerer' (sender) or 'answerer' (receiver)
   * @param signaling  adapter to exchange SDP/ICE (Cast namespace, WS, etc.)
   */
  constructor(
    private readonly role: 'offerer' | 'answerer',
    private readonly signaling: ISignaling,
  ) {
    // LAN-only: no STUN/TURN servers needed — mDNS ICE candidates work on
    // the same network, which is the standard Chromecast topology.
    this.pc = new RTCPeerConnection({ iceServers: [] });

    // Forward ICE candidates to the remote peer via signaling channel.
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send({
          type: 'webrtc-ice',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      console.log(`[WebRTCTransport] Connection state: ${state}`);
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.emit('disconnected');
      }
    };

    // Wire up incoming signals (offer/answer/ICE from the remote peer).
    this.signaling.onSignal((signal) => this.handleSignal(signal));
  }

  // ── Event emitter ─────────────────────────────────────────────────────────

  on<E extends TransportEvent>(event: E, listener: TransportEventMap[E]) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(listener as (...args: unknown[]) => void);
    return () => this.off(event, listener);
  }

  off<E extends TransportEvent>(event: E, listener: TransportEventMap[E]) {
    const arr = this.listeners.get(event) ?? [];
    this.listeners.set(event, arr.filter(l => l !== listener));
  }

  private emit<E extends TransportEvent>(event: E, ...args: Parameters<TransportEventMap[E]>) {
    this.listeners.get(event)?.forEach(l => l(...(args as unknown[])));
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Establish the peer connection.
   * Resolves when the RTCDataChannel is open and ready for messages.
   */
  connect(timeoutMs = 15_000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`WebRTC connect timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const onOpen = () => {
        clearTimeout(timer);
        this.emit('connected');
        resolve();
      };

      if (this.role === 'offerer') {
        // Sender creates the DataChannel *before* creating the offer.
        this.dc = this.pc.createDataChannel('wod-wiki', {
          ordered: true,
        });
        this.wireDataChannel(this.dc, onOpen);

        this.pc.createOffer()
          .then(offer => this.pc.setLocalDescription(offer))
          .then(() => {
            this.signaling.send({
              type: 'webrtc-offer',
              sdp: this.pc.localDescription!.sdp,
            });
          })
          .catch(reject);
      } else {
        // Answerer waits for the remote DataChannel to arrive.
        this.pc.ondatachannel = (event) => {
          this.dc = event.channel;
          this.wireDataChannel(this.dc, onOpen);
        };
        // The actual offer handling happens in handleSignal() which is
        // called by the signaling.onSignal wiring in the constructor.
      }
    });
  }

  /**
   * Send a JSON-serialisable message to the remote peer.
   * Uses the same message format as the previous WebSocket relay.
   */
  send(message: unknown): void {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.warn('[WebRTCTransport] DataChannel not open — dropping message');
      return;
    }
    this.dc.send(JSON.stringify(message));
  }

  /** Is the DataChannel currently open? */
  get isConnected(): boolean {
    return this.dc?.readyState === 'open';
  }

  /** Tear down the peer connection and data channel. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.dc?.close();
    this.pc.close();
    this.signaling.dispose();
    this.listeners.clear();
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private wireDataChannel(dc: RTCDataChannel, onOpen: () => void) {
    dc.onopen = () => {
      console.log('[WebRTCTransport] DataChannel open');
      onOpen();
    };

    dc.onclose = () => {
      console.log('[WebRTCTransport] DataChannel closed');
      this.emit('disconnected');
    };

    dc.onerror = (event) => {
      console.error('[WebRTCTransport] DataChannel error', event);
      this.emit('error', event);
    };

    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
      } catch (err) {
        console.error('[WebRTCTransport] Failed to parse message', err);
      }
    };
  }

  private async handleSignal(signal: WebRTCSignalMessage) {
    try {
      switch (signal.type) {
        case 'webrtc-offer': {
          // Only the answerer should handle offers.
          if (this.role !== 'answerer') return;
          await this.pc.setRemoteDescription({
            type: 'offer',
            sdp: signal.sdp,
          });
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          this.signaling.send({
            type: 'webrtc-answer',
            sdp: this.pc.localDescription!.sdp,
          });
          break;
        }
        case 'webrtc-answer': {
          // Only the offerer should handle answers.
          if (this.role !== 'offerer') return;
          await this.pc.setRemoteDescription({
            type: 'answer',
            sdp: signal.sdp,
          });
          break;
        }
        case 'webrtc-ice': {
          await this.pc.addIceCandidate(signal.candidate);
          break;
        }
      }
    } catch (err) {
      console.error('[WebRTCTransport] Signal handling error', err);
      this.emit('error', err);
    }
  }
}
