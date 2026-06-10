import { RpcMessage } from './RpcMessages';

/**
 * Unsubscribe function returned by event registration methods.
 */
export type RpcUnsubscribe = () => void;

/**
 * Transport-agnostic bidirectional RPC channel.
 *
 * Implementations handle the physical transport (WebRTC DataChannel, WebSocket, etc.)
 * while this interface provides typed message sending/receiving.
 */
export interface IRpcTransport {
    /** Send a typed RPC message to the remote peer. */
    send(message: RpcMessage): void;

    /**
     * Begin the connection lifecycle if not already connected. The WebRTC
     * implementation runs an SDP/ICE handshake; the local BroadcastChannel
     * implementation has no setup work to do (the ports are already paired
     * by the parent) and resolves immediately.
     *
     * Idempotent — if `connected` is already `true`, resolves without work.
     */
    connect(): Promise<void>;

    /** Register a handler for incoming RPC messages. Returns unsubscribe function. */
    onMessage(handler: (message: RpcMessage) => void): RpcUnsubscribe;

    /** Register a handler called when the transport connects. */
    onConnected(handler: () => void): RpcUnsubscribe;

    /** Register a handler called when the transport disconnects. */
    onDisconnected(handler: () => void): RpcUnsubscribe;

    /** Tear down the transport, closing channels and releasing resources. */
    dispose(): void;
}
