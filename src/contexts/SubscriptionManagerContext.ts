/**
 * SubscriptionManagerContext — React context providing access to the
 * SubscriptionManager for the current runtime.
 *
 * Used by CastButton to add/remove the ChromecastRuntimeSubscription
 * when cast sessions start/end.
 */

import { createContext, useContext } from 'react';
import { SubscriptionManager } from '@/hooks/useRuntimeTimer';

export const SubscriptionManagerContext = createContext<SubscriptionManager | null>(null);

/**
 * Access the current SubscriptionManager.
 * Returns null if no runtime is active (no provider above in the tree).
 */
export function useSubscriptionManager(): SubscriptionManager | null {
    return useContext(SubscriptionManagerContext);
}
