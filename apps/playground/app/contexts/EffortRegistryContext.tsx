/**
 * EffortRegistryContext
 *
 * Provides a CompositeEffortRegistry instance to the playground app.
 * Lazy-initializes on first mount and exposes async init state.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { IEffortRegistry, IEffort, EffortRegistrySource } from '@/effort-registry';
import { CompositeEffortRegistry } from '@/effort-registry';

interface EffortRegistryContextValue {
  registry: IEffortRegistry;
  isReady: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const EffortRegistryContext = createContext<EffortRegistryContextValue | null>(null);

let globalRegistry: CompositeEffortRegistry | null = null;

function getOrCreateRegistry(): CompositeEffortRegistry {
  if (!globalRegistry) {
    globalRegistry = new CompositeEffortRegistry();
  }
  return globalRegistry;
}

export function EffortRegistryProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const registry = getOrCreateRegistry();

  const init = useCallback(async () => {
    try {
      if (!registry.isInitialized()) {
        await registry.loadBundled();
      }
      setIsReady(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsReady(false);
    }
  }, [registry]);

  const refresh = useCallback(async () => {
    setIsReady(false);
    await init();
  }, [init]);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <EffortRegistryContext.Provider value={{ registry, isReady, error, refresh }}>
      {children}
    </EffortRegistryContext.Provider>
  );
}

export function useEffortRegistry(): EffortRegistryContextValue {
  const ctx = useContext(EffortRegistryContext);
  if (!ctx) {
    throw new Error('useEffortRegistry must be used within EffortRegistryProvider');
  }
  return ctx;
}

/**
 * Hook for catalog listing with search/filter.
 */
export function useEffortCatalog(options?: {
  origin?: EffortRegistrySource | 'all';
  discipline?: string;
  query?: string;
}): readonly IEffort[] {
  const { registry, isReady } = useEffortRegistry();

  if (!isReady) return [];

  let efforts = registry.list();

  if (options?.origin && options.origin !== 'all') {
    efforts = efforts.filter(e => e.registrySource === options.origin);
  }

  if (options?.discipline) {
    efforts = efforts.filter(e => e.baseAttributes.discipline === options.discipline);
  }

  if (options?.query?.trim()) {
    const q = options.query.trim().toLowerCase();
    efforts = efforts.filter(e =>
      e.label.toLowerCase().includes(q) ||
      e.aliases.some(a => a.toLowerCase().includes(q)) ||
      e.slug.toLowerCase().includes(q)
    );
  }

  return efforts;
}
