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

    /** Register a handler for incoming RPC messages. Returns unsubscribe function. */
    onMessage(handler: (message: RpcMessage) => void): RpcUnsubscribe;

    /** Whether the transport is currently connected and ready to send. */
    readonly connected: boolean;

    /** Register a handler called when the transport connects. */
    onConnected(handler: () => void): RpcUnsubscribe;

    /** Register a handler called when the transport disconnects. */
    onDisconnected(handler: () => void): RpcUnsubscribe;

    /** Tear down the transport, closing channels and releasing resources. */
    dispose(): void;
}
