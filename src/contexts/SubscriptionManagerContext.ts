/**
 * SubscriptionManagerContext — React context providing access to the
 * SubscriptionManager for the current runtime.
 *
 * The Provider is mounted by `RuntimeLifecycleProvider` so a future
 * consumer can subscribe via `useContext`. The reader hook was removed
 * per Finding 06 Step 5 (dead code cleanup) — no caller exercised it;
 * cast bridges read the manager via `useWorkbenchSessionStore.getState().subscriptionManager`
 * (the store one-shot pattern) instead.
 */
import { createContext } from 'react';
import { SubscriptionManager } from '@/hooks/useRuntimeTimer';

export const SubscriptionManagerContext = createContext<SubscriptionManager | null>(null);
