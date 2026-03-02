/**
 * WebRtcRpcTransport — Typed RPC transport over WebRTC DataChannel.
 *
 * Replaces the untyped WebRTCTransport with a strongly-typed message protocol.
 * Reuses the existing ISignaling adapters (SenderCastSignaling, ReceiverCastSignaling)
 * for SDP/ICE exchange via the Cast SDK custom namespace.
 *
 * Usage — Sender (offerer):
 *   const transport = new WebRtcRpcTransport('offerer', signaling);
 *   await transport.connect();
 *   transport.send({ type: 'rpc-stack-update', ... });
 *
 * Usage — Receiver (answerer):
 *   const transport = new WebRtcRpcTransport('answerer', signaling);
 *   await transport.connect();
 *   transport.onMessage(msg => { ... });
 */

import type { WebRTCSignalMessage } from '@/types/cast/messages';
import type { IRpcTransport, RpcUnsubscribe } from './IRpcTransport';
import type { RpcMessage } from './RpcMessages';

// ── Signaling interface (same as WebRTCTransport) ───────────────────────────

export interface ISignaling {
    send(signal: WebRTCSignalMessage): void;
    onSignal(handler: (signal: WebRTCSignalMessage) => void): void;
    dispose(): void;
}

// ── Transport ───────────────────────────────────────────────────────────────

export class WebRtcRpcTransport implements IRpcTransport {
    private pc: RTCPeerConnection;
    private dc: RTCDataChannel | null = null;
    private disposed = false;

    private messageHandlers = new Set<(message: RpcMessage) => void>();
    private connectedHandlers = new Set<() => void>();
    private disconnectedHandlers = new Set<() => void>();

    constructor(
        private readonly role: 'offerer' | 'answerer',
        private readonly signaling: ISignaling,
    ) {
        // LAN-only: no STUN/TURN servers needed for same-network Chromecast topology.
        this.pc = new RTCPeerConnection({ iceServers: [] });

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
            if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                this.notifyDisconnected();
            }
        };

        // Wire up incoming signals (offer/answer/ICE from the remote peer).
        this.signaling.onSignal((signal) => this.handleSignal(signal));
    }

    // ── IRpcTransport implementation ────────────────────────────────────────

    get connected(): boolean {
        return this.dc?.readyState === 'open';
    }

    send(message: RpcMessage): void {
        if (!this.dc || this.dc.readyState !== 'open') {
            console.warn('[WebRtcRpcTransport] DataChannel not open — dropping message');
            return;
        }
        this.dc.send(JSON.stringify(message));
    }

    onMessage(handler: (message: RpcMessage) => void): RpcUnsubscribe {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    onConnected(handler: () => void): RpcUnsubscribe {
        this.connectedHandlers.add(handler);
        return () => this.connectedHandlers.delete(handler);
    }

    onDisconnected(handler: () => void): RpcUnsubscribe {
        this.disconnectedHandlers.add(handler);
        return () => this.disconnectedHandlers.delete(handler);
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.dc?.close();
        this.pc.close();
        this.signaling.dispose();
        this.messageHandlers.clear();
        this.connectedHandlers.clear();
        this.disconnectedHandlers.clear();
    }

    // ── Connection lifecycle ────────────────────────────────────────────────

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
                this.notifyConnected();
                resolve();
            };

            if (this.role === 'offerer') {
                this.dc = this.pc.createDataChannel('wod-wiki-rpc', { ordered: true });
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
            }
        });
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private wireDataChannel(dc: RTCDataChannel, onOpen: () => void): void {
        dc.onopen = () => onOpen();

        dc.onclose = () => this.notifyDisconnected();

        dc.onerror = (event) => {
            console.error('[WebRtcRpcTransport] DataChannel error', event);
        };

        dc.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as RpcMessage;
                for (const handler of this.messageHandlers) {
                    handler(data);
                }
            } catch (err) {
                console.error('[WebRtcRpcTransport] Failed to parse RPC message', err);
            }
        };
    }

    private async handleSignal(signal: WebRTCSignalMessage): Promise<void> {
        try {
            switch (signal.type) {
                case 'webrtc-offer': {
                    if (this.role !== 'answerer') return;
                    await this.pc.setRemoteDescription({
                        type: 'offer',
                        sdp: (signal as any).sdp,
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
                    if (this.role !== 'offerer') return;
                    await this.pc.setRemoteDescription({
                        type: 'answer',
                        sdp: (signal as any).sdp,
                    });
                    break;
                }
                case 'webrtc-ice': {
                    await this.pc.addIceCandidate((signal as any).candidate);
                    break;
                }
            }
        } catch (err) {
            console.error(`[WebRtcRpcTransport:${this.role}] Signal handling error`, err);
        }
    }

    private notifyConnected(): void {
        for (const handler of this.connectedHandlers) handler();
    }

    private notifyDisconnected(): void {
        for (const handler of this.disconnectedHandlers) handler();
    }
}
