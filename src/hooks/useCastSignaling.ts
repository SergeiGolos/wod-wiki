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
 * connected `IRpcTransport`, then hand it to the concrete view-session /
 * subscription / event-provider / clock-sync classes re-exported below.
 *
 * Why a barrel at all? The components layer needs *some* path to the cast
 * stack's concrete classes (the bridges wire their own subscription on
 * top of the transport). Keeping the barrel narrow — types + a few
 * concrete classes — preserves the seam: the components layer can be
 * told "here is the cast stack" without re-exporting the SDK plumbing.
 */

export {
    type IViewSession,
    ChromecastSenderViewSession,
} from '@/services/cast/rpc/ViewSession';
export { ChromecastRuntimeSubscription } from '@/services/cast/rpc/ChromecastRuntimeSubscription';
export { ChromecastEventProvider } from '@/services/cast/rpc/ChromecastEventProvider';
export { ClockSyncService } from '@/services/cast/rpc/ClockSync';

export type { RpcWorkbenchUpdate, RpcMessage, RpcStackUpdate, RpcOutputStatement } from '@/services/cast/rpc/RpcMessages';
export type { IRpcTransport } from '@/services/cast/rpc/IRpcTransport';
