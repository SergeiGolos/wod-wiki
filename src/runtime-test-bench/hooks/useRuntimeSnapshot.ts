import { useMemo } from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { RuntimeAdapter } from '../adapters/RuntimeAdapter';
import { UseRuntimeSnapshotReturn } from '../types/interfaces';

/**
 * Hook that converts ScriptRuntime to ExecutionSnapshot using RuntimeAdapter
 * Provides loading and error states for UI feedback
 *
 * @param runtime - ScriptRuntime instance to snapshot
 * @returns ExecutionSnapshot with loading/error states
 */
export function useRuntimeSnapshot(runtime?: ScriptRuntime): UseRuntimeSnapshotReturn {
  return useMemo(() => {
    if (!runtime) {
      return {
        snapshot: undefined,
        loading: false,
        error: undefined
      };
    }

    try {
      const adapter = new RuntimeAdapter();
      const snapshot = adapter.createSnapshot(runtime);

      return {
        snapshot,
        loading: false,
        error: undefined
      };
    } catch (error) {
      return {
        snapshot: undefined,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error creating snapshot')
      };
    }
  }, [runtime]);
}