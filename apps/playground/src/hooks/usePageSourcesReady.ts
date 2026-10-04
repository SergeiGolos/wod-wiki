import { useEffect, useSyncExternalStore } from 'react';
import {
  ensurePageSources,
  sourcesReadySnapshot,
  subscribePageSourcesReady,
} from '@/services/queryService';

/** First-paint gate for query-bearing surfaces: true once the standard
 *  page-source datasets are populated (or population failed — the gate
 *  releases without claiming success and child queries render the real
 *  storage error from the cached rejection). */
export function usePageSourcesReady(): boolean {
  useEffect(() => {
    void ensurePageSources().catch((err) =>
      console.warn('[queryService] page source population failed', err),
    );
  }, []);
  return useSyncExternalStore(subscribePageSourcesReady, sourcesReadySnapshot);
}
