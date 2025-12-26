import { useMemo } from 'react';
import { IScriptRuntime } from '../../runtime/IScriptRuntime';
import { RuntimeSpan } from '../../runtime/models/RuntimeSpan';
import { useTrackedSpans } from './useExecutionSpans';

// Re-export RuntimeSpan as ExecutionRecord for backward compatibility (if needed)
export type ExecutionRecord = RuntimeSpan;

export interface ExecutionLogData {
  /** Completed execution spans (history) */
  history: RuntimeSpan[];
  /** Currently active execution spans */
  active: RuntimeSpan[];
}

/**
 * Legacy compatibility hook - wraps useTrackedSpans to match useExecutionLog interface.
 * 
 * @deprecated Use useTrackedSpans instead.
 * 
 * @param runtime The runtime instance to monitor
 * @returns ExecutionLogData containing history and active spans
 */
export function useExecutionLog(runtime: IScriptRuntime | null): ExecutionLogData {
  const { runtimeSpans } = useTrackedSpans(runtime);

  return useMemo(() => {
    const active = runtimeSpans.filter(s => s.isActive());
    const completed = runtimeSpans.filter(s => !s.isActive());

    return {
      history: completed,
      active
    };
  }, [runtimeSpans]);
}
