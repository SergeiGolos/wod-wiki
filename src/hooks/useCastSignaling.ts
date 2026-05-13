/**
 * useCastSignaling — Public hook boundary for Chromecast / RPC cast access.
 *
 * Re-exports all cast-related classes and types from the services layer
 * so that components in `src/components/` never need to import directly
 * from `src/services/cast/`.
 *
 * Provides a `useCastSignaling` hook that manages ChromecastSdk state
 * reactively.
 */

import { useState, useEffect } from 'react';

// ── SDK & signaling ───────────────────────────────────────────────────────
export { ChromecastSdk } from '@/services/cast/ChromecastSdk';
export type { CastSdkState } from '@/services/cast/ChromecastSdk';
export { SenderCastSignaling } from '@/services/cast/CastSignaling';

// ── RPC transport & subscriptions ─────────────────────────────────────────
export { WebRtcRpcTransport } from '@/services/cast/rpc/WebRtcRpcTransport';
export { ChromecastRuntimeSubscription } from '@/services/cast/rpc/ChromecastRuntimeSubscription';
export { ChromecastEventProvider } from '@/services/cast/rpc/ChromecastEventProvider';
export { ClockSyncService } from '@/services/cast/rpc/ClockSync';
export {
  type IViewSession,
  ChromecastSenderViewSession,
  ChromecastReceiverViewSession,
  LocalViewSession,
} from '@/services/cast/rpc/ViewSession';

// ── Configuration ─────────────────────────────────────────────────────────
export { CAST_APP_ID, hasCustomCastAppId, DEFAULT_MEDIA_RECEIVER_APP_ID } from '@/services/cast/config';

// ── Types ─────────────────────────────────────────────────────────────────
export type { RpcWorkbenchUpdate, RpcMessage, RpcStackUpdate, RpcOutputStatement } from '@/services/cast/rpc/RpcMessages';
export type { IRpcTransport } from '@/services/cast/rpc/IRpcTransport';

// ── Legacy WebRTC transport ───────────────────────────────────────────────
export { WebRTCTransport } from '@/services/cast/WebRTCTransport';

// ── React hook ────────────────────────────────────────────────────────────

import { ChromecastSdk as SDK } from '@/services/cast/ChromecastSdk';
import type { CastSdkState } from '@/services/cast/ChromecastSdk';

export interface UseCastSignalingReturn {
  /** Current state of the Chromecast SDK */
  sdkState: CastSdkState;
  /** Whether a cast session is currently active */
  isCasting: boolean;
}

/**
 * Hook to reactively observe Chromecast SDK state.
 *
 * Components should use this hook instead of reading from `ChromecastSdk`
 * directly, so they get reactive updates when the SDK state changes.
 *
 * @example
 * ```tsx
 * const { sdkState, isCasting } = useCastSignaling();
 * ```
 */
export function useCastSignaling(): UseCastSignalingReturn {
  const [sdkState, setSdkState] = useState<CastSdkState>(() => SDK.getState());
  const [isCasting, setIsCasting] = useState(() => SDK.isSessionActive());

  useEffect(() => {
    const unsub = SDK.on('state-changed', (newState) => {
      setSdkState(newState as CastSdkState);
      setIsCasting(newState === 'session-active');
    });

    return unsub;
  }, []);

  return { sdkState, isCasting };
}
