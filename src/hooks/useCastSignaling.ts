/**
 * useCastSignaling — Public cast surface for components in `src/components/`.
 *
 * Re-exports the cast types and concrete classes that downstream consumers
 * (cast bridges, the cast timer panel, the workbench sync store) need to
 * interact with the cast stack. The *implementation* of the cast stack —
 * `ChromecastSdk`, `SenderCastSignaling`, `WebRtcRpcTransport`, the SDK
 * config — is no longer exposed here. Callers go through the
 * `ICastBackend` port (`@/services/cast/ICastBackend`) and
 * `getCastBackend()` (`@/services/cast/getCastBackend`) to obtain a
 * connected `IRpcTransport`, then hand it to the `CastSessionManager`
 * (the only thing the components layer wires on top of the transport).
 *
 * Why a barrel at all? The components layer needs *some* path to the cast
 * stack's classes. Keeping the barrel narrow — types + the session
 * manager + a few concrete implementations — preserves the seam: the
 * components layer can be told "here is the cast stack" without
 * re-exporting the SDK plumbing.
 */

export {
    CastSessionManager,
    type CastSessionHandle,
    type CastSessionConnectOptions,
    type CastSessionManagerDeps,
    type SubscriptionRegistry,
} from '@/services/cast/rpc/CastSessionManager';
export {
    createReceiverSession,
    type ReceiverSessionHandle,
    type ReceiverSessionOptions,
    type ReceiverSessionDeps,
} from '@/services/cast/rpc/ReceiverSessionManager';
export { ChromecastRuntimeSubscription } from '@/services/cast/rpc/ChromecastRuntimeSubscription';
export { ChromecastEventProvider } from '@/services/cast/rpc/ChromecastEventProvider';
export { ClockSyncService } from '@/services/cast/rpc/ClockSync';
export type { IRuntimeSubscription } from '@/runtime/contracts/IRuntimeSubscription';
export type { ICastSubscription } from '@/runtime/contracts/ICastSubscription';
export type { IRuntimeEventProvider } from '@/runtime/contracts/IRuntimeEventProvider';
export type { RpcWorkbenchUpdate, RpcMessage, RpcStackUpdate, RpcOutputStatement } from '@/services/cast/rpc/RpcMessages';
export type { IRpcTransport } from '@/services/cast/rpc/IRpcTransport';
