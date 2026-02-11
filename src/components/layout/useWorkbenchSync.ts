/**
 * useWorkbenchSync - Backward-compatible hook for consuming workbench synced state
 *
 * Wraps the Zustand store to provide the same API surface that WorkbenchContent
 * was consuming from the old React Context. This avoids a large diff in
 * Workbench.tsx while still getting Zustand's selector-based re-renders
 * under the hood.
 *
 * For new code / panel components, prefer using the Zustand store directly
 * with selectors for optimal re-render performance:
 *
 * ```tsx
 * import { useWorkbenchSyncStore } from './workbenchSyncStore';
 *
 * // Only re-renders when hoveredBlockKey changes
 * const hoveredBlockKey = useWorkbenchSyncStore(s => s.hoveredBlockKey);
 * ```
 */

import { useWorkbenchSyncStore } from './workbenchSyncStore';

export const useWorkbenchSync = () => {
  return useWorkbenchSyncStore();
};
