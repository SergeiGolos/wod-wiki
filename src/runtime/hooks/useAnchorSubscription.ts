import { useMemo } from 'react';
import { useRuntimeContext } from '../context/RuntimeContext';
import { useMemorySubscription } from './useMemorySubscription';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { TypedMemoryReference } from '../IMemoryReference';
import { IAnchorValue } from '../IAnchorValue';

/**
 * React hook for subscribing to data via anchor references.
 * 
 * This hook provides a layer of indirection between UI components and data sources.
 * Instead of subscribing directly to a memory reference, components subscribe to
 * a stable anchor ID. The anchor's value describes how to find the actual data.
 * 
 * Benefits:
 * - UI components are decoupled from data source ownership and structure
 * - Data sources can be changed dynamically by updating the anchor
 * - Reduces boilerplate code in UI components
 * - Centralizes data binding logic in runtime behaviors
 * 
 * @param anchorId The stable ID of the anchor to subscribe to (e.g., 'anchor-main-workout-clock')
 * @returns The current value from the resolved data reference, or undefined if not available
 * 
 * @example
 * ```tsx
 * // In a clock display component
 * function ClockDisplay({ anchorId }: { anchorId: string }) {
 *   const timeSpans = useAnchorSubscription<TimeSpan[]>(anchorId);
 *   
 *   const elapsed = calculateElapsed(timeSpans);
 *   return <div>{formatTime(elapsed)}</div>;
 * }
 * 
 * // Usage
 * <ClockDisplay anchorId="anchor-main-workout-clock" />
 * ```
 */
export function useAnchorSubscription<T>(anchorId: string): T | undefined {
  const runtime = useRuntimeContext();

  // 1. Find the anchor reference itself (this should be stable)
  const anchorRef = useMemo(() => {
    const refs = runtime.memory.search({ 
      id: anchorId, 
      type: MemoryTypeEnum.ANCHOR,
      ownerId: null,
      visibility: null
    });
    return refs[0] as TypedMemoryReference<IAnchorValue> | undefined;
  }, [runtime, anchorId]);

  // 2. Subscribe to the anchor's value. If it changes, we'll re-run the search.
  const anchorValue = useMemorySubscription(anchorRef);

  // 3. Find the target data reference based on the anchor's value
  const dataRef = useMemo(() => {
    if (!anchorValue?.searchCriteria) return undefined;
    
    // Merge with default null values for partial criteria
    const criteria = {
      id: null,
      ownerId: null,
      type: null,
      visibility: null,
      ...anchorValue.searchCriteria
    };
    
    const dataRefs = runtime.memory.search(criteria);
    return dataRefs[0] as TypedMemoryReference<T> | undefined;
  }, [runtime, anchorValue]);

  // 4. Subscribe to the actual data and return it
  return useMemorySubscription(dataRef);
}
