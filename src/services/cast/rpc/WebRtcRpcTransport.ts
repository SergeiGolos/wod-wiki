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
    onSignal(handler: (signal: WebRTCSignalMessage) => void): () => void;
    dispose(): void;
}

// ── Transport ───────────────────────────────────────────────────────────────

export class WebRtcRpcTransport implements IRpcTransport {
    private pc: RTCPeerConnection;
    private dc: RTCDataChannel | null = null;
    private signalUnsub: (() => void) | null = null;
    private disposed = false;

    private messageHandlers = new Set<(message: RpcMessage) => void>();
    private connectedHandlers = new Set<() => void>();
    private disconnectedHandlers = new Set<() => void>();

    // Queuing for signals to ensure sequential processing
    private signalQueue: Promise<void> = Promise.resolve();
    private pendingIceCandidates: RTCIceCandidateInit[] = [];

    constructor(
        private readonly role: 'offerer' | 'answerer',
        private readonly signaling: ISignaling,
    ) {
        console.log(`[WebRtcRpcTransport:${role}] Initializing transport`);
        
        // LAN-only: mDNS ICE candidates work on same network.
        // Adding a public STUN server can help some NAT/firewall scenarios even on LAN.
        this.pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`[WebRtcRpcTransport:${role}] ICE candidate (local):`, event.candidate.candidate.substring(0, 60) + '...');
                this.signaling.send({
                    type: 'webrtc-ice',
                    candidate: event.candidate.toJSON(),
                });
            } else {
                console.log(`[WebRtcRpcTransport:${role}] ICE gathering complete`);
            }
        };

        this.pc.onconnectionstatechange = () => {
            const state = this.pc.connectionState;
            console.log(`[WebRtcRpcTransport:${role}] Connection state: ${state}`);
            if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                this.notifyDisconnected();
            }
        };

        this.pc.oniceconnectionstatechange = () => {
            console.log(`[WebRtcRpcTransport:${role}] ICE connection state: ${this.pc.iceConnectionState}`);
        };

        this.pc.onsignalingstatechange = () => {
            console.log(`[WebRtcRpcTransport:${role}] Signaling state: ${this.pc.signalingState}`);
        };

        // Wire up incoming signals. We queue them to ensure sequential async processing.
        this.signalUnsub = this.signaling.onSignal((signal) => {
            console.log(`[WebRtcRpcTransport:${role}] Incoming signal: ${signal.type}`);
            this.signalQueue = this.signalQueue.then(() => this.handleSignal(signal));
        });
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

        this.signalUnsub?.();
        this.signalUnsub = null;

        // Snapshot and clear handlers BEFORE notifying so that re-entrant
        // calls inside the notification (e.g. cleanupCast → transport.dispose())
        // find an already-empty handler set and do nothing additional.
        const wasConnected = this.dc?.readyState === 'open';
        const disconnectedSnapshot = [...this.disconnectedHandlers];

        this.messageHandlers.clear();
        this.connectedHandlers.clear();
        this.disconnectedHandlers.clear();

        this.dc?.close();
        this.pc.close();
        this.signaling.dispose();

        // Notify AFTER clearing so the listeners don’t see a half-torn-down
        // transport in their handler sets, and re-entrant dispose() calls are
        // no-ops.  Only fire if the DataChannel was actually open — avoids
        // spurious disconnect events for transports that never connected.
        if (wasConnected) {
            for (const handler of disconnectedSnapshot) handler();
        }
    }

    // ── Connection lifecycle ────────────────────────────────────────────────

    /**
     * Establish the peer connection.
     * Resolves when the RTCDataChannel is open and ready for messages.
     */
    connect(timeoutMs = 15_000): Promise<void> {
        console.log(`[WebRtcRpcTransport:${this.role}] connect() starting, timeout=${timeoutMs}ms`);
        return new Promise((resolve, reject) => {
            const t0 = Date.now();
            const timer = setTimeout(() => {
                const diag = `pcState=${this.pc.connectionState}, iceState=${this.pc.iceConnectionState}, sigState=${this.pc.signalingState}, dcState=${this.dc?.readyState ?? 'null'}`;
                console.error(`[WebRtcRpcTransport:${this.role}] TIMEOUT after ${timeoutMs}ms — ${diag}`);
                reject(new Error(`WebRTC connect timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            const onOpen = () => {
                clearTimeout(timer);
                console.log(`[WebRtcRpcTransport:${this.role}] DataChannel OPEN in ${Date.now() - t0}ms`);
                this.notifyConnected();
                resolve();
            };

            if (this.role === 'offerer') {
                console.log(`[WebRtcRpcTransport:offerer] Creating DataChannel…`);
                this.dc = this.pc.createDataChannel('wod-wiki-rpc', { ordered: true });
                this.wireDataChannel(this.dc, onOpen);

                console.log(`[WebRtcRpcTransport:offerer] Creating offer…`);
                this.pc.createOffer()
                    .then(offer => {
                        console.log(`[WebRtcRpcTransport:offerer] Offer created, SDP length=${offer.sdp?.length}`);
                        return this.pc.setLocalDescription(offer);
                    })
                    .then(() => {
                        console.log(`[WebRtcRpcTransport:offerer] Local description set — sending offer via signaling`);
                        this.signaling.send({
                            type: 'webrtc-offer',
                            sdp: this.pc.localDescription!.sdp,
                        });
                        console.log(`[WebRtcRpcTransport:offerer] Offer sent — waiting for answer…`);
                    })
                    .catch(err => {
                        console.error(`[WebRtcRpcTransport:offerer] Failed to create/set offer`, err);
                        reject(err);
                    });
            } else {
                // Answerer waits for the remote DataChannel to arrive.
                console.log(`[WebRtcRpcTransport:answerer] Waiting for ondatachannel…`);
                this.pc.ondatachannel = (event) => {
                    console.log(`[WebRtcRpcTransport:answerer] Remote DataChannel received: ${event.channel.label}`);
                    this.dc = event.channel;
                    this.wireDataChannel(this.dc, onOpen);
                };
            }
        });
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private wireDataChannel(dc: RTCDataChannel, onOpen: () => void): void {
        dc.onopen = () => onOpen();

        // Guard against double-notification: dispose() already notifies before
        // clearing handlers, so if we are disposed the handlers set is empty and
        // iterating it is a no-op — but guard explicitly for clarity.
        dc.onclose = () => {
            if (!this.disposed) this.notifyDisconnected();
        };

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
                    if (this.role !== 'answerer') {
                        console.warn(`[WebRtcRpcTransport:${this.role}] Ignoring offer (not an answerer)`);
                        return;
                    }
                    console.log(`[WebRtcRpcTransport:answerer] Received offer, length=${(signal as any).sdp?.length}`);
                    await this.pc.setRemoteDescription({
                        type: 'offer',
                        sdp: (signal as any).sdp,
                    });
                    console.log(`[WebRtcRpcTransport:answerer] Remote description set — creating answer`);
                    const answer = await this.pc.createAnswer();
                    console.log(`[WebRtcRpcTransport:answerer] Answer created, length=${answer.sdp?.length}`);
                    await this.pc.setLocalDescription(answer);
                    console.log(`[WebRtcRpcTransport:answerer] Local description set — sending answer via signaling`);
                    this.signaling.send({
                        type: 'webrtc-answer',
                        sdp: this.pc.localDescription!.sdp,
                    });
                    
                    // Process any ICE candidates that arrived before the offer
                    await this.processPendingIceCandidates();
                    break;
                }
                case 'webrtc-answer': {
                    if (this.role !== 'offerer') {
                        console.warn(`[WebRtcRpcTransport:${this.role}] Ignoring answer (not an offerer)`);
                        return;
                    }
                    console.log(`[WebRtcRpcTransport:offerer] Received answer, length=${(signal as any).sdp?.length}`);
                    await this.pc.setRemoteDescription({
                        type: 'answer',
                        sdp: (signal as any).sdp,
                    });
                    console.log(`[WebRtcRpcTransport:offerer] Remote description set — processing pending candidates…`);
                    
                    // Process any ICE candidates that arrived before the answer
                    await this.processPendingIceCandidates();
                    break;
                }
                case 'webrtc-ice': {
                    const candidate = (signal as any).candidate;
                    if (!this.pc.remoteDescription) {
                        console.log(`[WebRtcRpcTransport:${this.role}] Buffering candidate until remote description is set`);
                        this.pendingIceCandidates.push(candidate);
                    } else {
                        console.log(`[WebRtcRpcTransport:${this.role}] Adding remote ICE candidate`);
                        await this.pc.addIceCandidate(candidate);
                    }
                    break;
                }
            }
        } catch (err) {
            console.error(`[WebRtcRpcTransport:${this.role}] Signal handling error`, err);
        }
    }

    private async processPendingIceCandidates(): Promise<void> {
        if (this.pendingIceCandidates.length === 0) return;
        console.log(`[WebRtcRpcTransport:${this.role}] Processing ${this.pendingIceCandidates.length} buffered ICE candidates`);
        const candidates = [...this.pendingIceCandidates];
        this.pendingIceCandidates = [];
        
        for (const candidate of candidates) {
            try {
                await this.pc.addIceCandidate(candidate);
                console.log(`[WebRtcRpcTransport:${this.role}] Buffered ICE candidate added OK`);
            } catch (err) {
                console.error(`[WebRtcRpcTransport:${this.role}] Failed to add buffered ICE candidate`, err);
            }
        }
    }

    private notifyConnected(): void {
        for (const handler of this.connectedHandlers) handler();
    }

    private notifyDisconnected(): void {
        for (const handler of this.disconnectedHandlers) handler();
    }
}
