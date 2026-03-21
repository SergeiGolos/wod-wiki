/**
 * ScopedRuntimeProvider Component
 *
 * Lightweight wrapper around RuntimeLifecycleProvider that creates
 * an isolated runtime scope. Safe to nest — each instance maintains
 * its own RuntimeLifecycleContext and SubscriptionManagerContext.
 *
 * Disposes its runtime on unmount (handled by RuntimeLifecycleProvider).
 */

import type { ReactNode } from 'react';
import { RuntimeLifecycleProvider } from '@/components/layout/RuntimeLifecycleProvider';
import type { IRuntimeFactory } from '@/runtime/compiler/RuntimeFactory';

export interface ScopedRuntimeProviderProps {
  /** Runtime factory — creates isolated runtime instances */
  factory: IRuntimeFactory;

  /** Child components that receive the scoped runtime context */
  children: ReactNode;
}

/**
 * ScopedRuntimeProvider
 *
 * Wraps children in a RuntimeLifecycleProvider with the given factory.
 * Each ScopedRuntimeProvider creates its own independent runtime scope:
 * - Own RuntimeLifecycleContext (runtime, initializeRuntime, disposeRuntime)
 * - Own SubscriptionManagerContext (LocalRuntimeSubscription)
 * - Automatic disposal on unmount
 *
 * Nesting is safe — inner providers shadow outer contexts without conflict.
 */
export function ScopedRuntimeProvider({
  factory,
  children,
}: ScopedRuntimeProviderProps) {
  return (
    <RuntimeLifecycleProvider factory={factory}>
      {children}
    </RuntimeLifecycleProvider>
  );
}

export default ScopedRuntimeProvider;
