import { useState, useEffect } from 'react';
import { IScriptRuntime } from '../../runtime/IScriptRuntime';
import { ExecutionSpan, EXECUTION_SPAN_TYPE } from '../../runtime/models/ExecutionSpan';
import { TypedMemoryReference } from '../../runtime/IMemoryReference';

// Re-export ExecutionSpan as ExecutionRecord for backward compatibility
export type { ExecutionSpan as ExecutionRecord } from '../../runtime/models/ExecutionSpan';

export interface ExecutionLogData {
  /** Completed execution spans (history) */
  history: ExecutionSpan[];
  /** Currently active execution spans */
  active: ExecutionSpan[];
}

/**
 * React hook that subscribes to execution span updates from a runtime.
 * Returns both historical (completed) and active execution spans.
 * 
 * This hook uses reactive memory subscriptions (no polling).
 * 
 * @param runtime The runtime instance to monitor
 * @returns ExecutionLogData containing history and active spans
 * 
 * @example
 * ```tsx
 * const { history, active } = useExecutionLog(runtime);
 * 
 * // Display active workouts
 * {active.map(span => (
 *   <div key={span.id}>{span.label} - {span.status}</div>
 * ))}
 * 
 * // Display history
 * {history.map(span => (
 *   <div key={span.id}>
 *     {span.label} - {span.endTime! - span.startTime}ms
 *   </div>
 * ))}
 * ```
 */
export function useExecutionLog(runtime: IScriptRuntime | null): ExecutionLogData {
  const [logData, setLogData] = useState<ExecutionLogData>({
    history: [],
    active: []
  });

  useEffect(() => {
    if (!runtime?.memory) {
      setLogData({ history: [], active: [] });
      return;
    }

    // Fetch all execution spans from memory
    const updateLogData = () => {
      const refs = runtime.memory.search({
        type: EXECUTION_SPAN_TYPE,
        id: null,
        ownerId: null,
        visibility: null
      });

      const allSpans = refs
        .map(ref => runtime.memory.get(ref as TypedMemoryReference<ExecutionSpan>))
        .filter((s): s is ExecutionSpan => s !== null);

      setLogData({
        history: allSpans.filter(s => s.status !== 'active'),
        active: allSpans.filter(s => s.status === 'active')
      });
    };

    // Initial load
    updateLogData();

    // Subscribe to memory changes (reactive, no polling!)
    const unsubscribe = runtime.memory.subscribe((ref, _value, _oldValue) => {
      // Only update if the changed memory is an execution span
      if (ref.type === EXECUTION_SPAN_TYPE) {
        updateLogData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [runtime]);

  return logData;
}
