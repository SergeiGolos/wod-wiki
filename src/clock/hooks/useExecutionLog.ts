import { useState, useEffect } from 'react';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { ExecutionRecord } from '../../runtime/models/ExecutionRecord';

export interface ExecutionLogData {
  /** Completed execution records (history) */
  history: ExecutionRecord[];
  /** Currently active execution records */
  active: ExecutionRecord[];
}

/**
 * React hook that subscribes to execution log updates from a ScriptRuntime.
 * Returns both historical (completed) and active execution records.
 * 
 * @param runtime The ScriptRuntime instance to monitor
 * @returns ExecutionLogData containing history and active records
 * 
 * @example
 * ```tsx
 * const { history, active } = useExecutionLog(runtime);
 * 
 * // Display active workouts
 * {active.map(record => (
 *   <div key={record.id}>{record.label} - {record.status}</div>
 * ))}
 * 
 * // Display history
 * {history.map(record => (
 *   <div key={record.id}>
 *     {record.label} - {record.endTime! - record.startTime}ms
 *   </div>
 * ))}
 * ```
 */
export function useExecutionLog(runtime: ScriptRuntime | null): ExecutionLogData {
  const [logData, setLogData] = useState<ExecutionLogData>({
    history: [],
    active: []
  });

  useEffect(() => {
    if (!runtime) {
      setLogData({ history: [], active: [] });
      return;
    }

    // Initial load
    const updateLogData = () => {
      setLogData({
        history: [...runtime.executionLog],
        active: Array.from(runtime.activeSpans.values())
      });
    };

    updateLogData();

    // Poll for updates (could be optimized with event subscription if ScriptRuntime emits events)
    const interval = setInterval(updateLogData, 100);

    return () => {
      clearInterval(interval);
    };
  }, [runtime]);

  return logData;
}
