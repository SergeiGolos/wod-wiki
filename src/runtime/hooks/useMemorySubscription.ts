import { useState, useEffect } from 'react';
import { TypedMemoryReference } from '../IMemoryReference';

/**
 * React hook for subscribing to memory reference changes.
 * 
 * This hook automatically manages the subscription lifecycle:
 * - Subscribes when the component mounts or when memoryRef changes
 * - Unsubscribes when the component unmounts or when memoryRef changes
 * - Returns the current value and updates when the memory changes
 * 
 * @param memoryRef The memory reference to subscribe to (can be undefined)
 * @returns The current value from the memory reference, or undefined if not available
 * 
 * @example
 * ```tsx
 * const runtime = useRuntimeContext();
 * const timeSpansRef = runtime.memory.search({ 
 *   type: 'timer-time-spans', 
 *   ownerId: blockKey 
 * })[0] as TypedMemoryReference<TimeSpan[]>;
 * 
 * const timeSpans = useMemorySubscription(timeSpansRef);
 * ```
 */
export function useMemorySubscription<T>(
  memoryRef: TypedMemoryReference<T> | undefined
): T | undefined {
  const [value, setValue] = useState<T | undefined>(memoryRef?.get());

  useEffect(() => {
    if (!memoryRef) {
      setValue(undefined);
      return;
    }

    // Set initial value
    setValue(memoryRef.get());

    // Subscribe to memory changes
    const unsubscribe = memoryRef.subscribe((newValue) => {
      setValue(newValue);
    });

    return unsubscribe;
  }, [memoryRef]);

  return value;
}
