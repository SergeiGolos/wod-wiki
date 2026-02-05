import { useState, useEffect, useMemo, useRef } from 'react';
import { IScriptRuntime } from '../../runtime/contracts/IScriptRuntime';
import { IOutputStatement } from '../../core/models/OutputStatement';

/**
 * Data structure returned by useOutputStatements hook
 */
export interface OutputStatementsData {
  /** All output statements sorted by start time */
  outputs: IOutputStatement[];
  /** Outputs indexed by ID for quick lookup */
  byId: Map<number, IOutputStatement>;
  /** Outputs indexed by sourceBlockKey */
  byBlockKey: Map<string, IOutputStatement[]>;
  /** Segment outputs (timed execution segments) */
  segments: IOutputStatement[];
  /** Completion outputs */
  completions: IOutputStatement[];
  /** Metric outputs */
  metrics: IOutputStatement[];
}

/**
 * React hook that subscribes to output statement updates from a runtime.
 * 
 * This is the new API for tracking workout execution history.
 * Uses runtime.subscribeToOutput() for real-time updates.
 * 
 * @param runtime The runtime instance to monitor (can be null)
 * @returns OutputStatementsData containing outputs and indexed maps
 */
export function useOutputStatements(runtime: IScriptRuntime | null): OutputStatementsData {
  const [outputs, setOutputs] = useState<IOutputStatement[]>([]);
  const ownerIdRef = useRef(`useOutputStatements-${crypto.randomUUID()}`);

  useEffect(() => {
    if (!runtime) {
      setOutputs([]);
      return;
    }

    // Initial load
    setOutputs(runtime.getOutputStatements());

    // Subscribe to new output statements
    const unsubscribe = runtime.subscribeToOutput(() => {
      setOutputs(runtime.getOutputStatements());
    });

    return unsubscribe;
  }, [runtime]);

  // Compute derived data (memoized for performance)
  const data = useMemo<OutputStatementsData>(() => {
    const byId = new Map<number, IOutputStatement>();
    const byBlockKey = new Map<string, IOutputStatement[]>();
    const segments: IOutputStatement[] = [];
    const completions: IOutputStatement[] = [];
    const metrics: IOutputStatement[] = [];

    for (const output of outputs) {
      // Index by ID
      byId.set(output.id, output);

      // Index by block key
      const blockOutputs = byBlockKey.get(output.sourceBlockKey) ?? [];
      blockOutputs.push(output);
      byBlockKey.set(output.sourceBlockKey, blockOutputs);

      // Categorize by type
      switch (output.outputType) {
        case 'segment':
          segments.push(output);
          break;
        case 'completion':
          completions.push(output);
          break;
        case 'metric':
          metrics.push(output);
          break;
      }
    }

    return { outputs, byId, byBlockKey, segments, completions, metrics };
  }, [outputs]);

  return data;
}

/**
 * Hook to get a specific output by ID
 */
export function useOutputStatement(
  runtime: IScriptRuntime | null,
  id: number | null
): IOutputStatement | undefined {
  const { byId } = useOutputStatements(runtime);

  if (id === null) return undefined;
  return byId.get(id);
}

/**
 * Hook to get outputs for a specific block
 */
export function useBlockOutputs(
  runtime: IScriptRuntime | null,
  blockKey: string | null
): IOutputStatement[] {
  const { byBlockKey } = useOutputStatements(runtime);

  if (!blockKey) return [];
  return byBlockKey.get(blockKey) ?? [];
}

/**
 * Hook to compute output hierarchy (parent-child relationships) based on stackLevel
 */
export function useOutputHierarchy(runtime: IScriptRuntime | null): Map<number, number> {
  const { outputs } = useOutputStatements(runtime);

  return useMemo(() => {
    const depthMap = new Map<number, number>();

    for (const output of outputs) {
      depthMap.set(output.id, output.stackLevel);
    }

    return depthMap;
  }, [outputs]);
}

// ============================================================================
// Legacy compatibility exports (deprecated)
// ============================================================================

import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../../runtime/models/RuntimeSpan';
import { TypedMemoryReference } from '../../runtime/contracts/IMemoryReference';
import { searchStackMemory } from '../../runtime/utils/MemoryUtils';

/**
 * @deprecated Use OutputStatementsData instead
 */
export interface TrackedSpansData {
  /** @deprecated */
  active: RuntimeSpan[];
  /** @deprecated */
  completed: RuntimeSpan[];
  /** @deprecated */
  byId: Map<string, RuntimeSpan>;
  /** @deprecated */
  byBlockId: Map<string, RuntimeSpan>;
  /** @deprecated */
  runtimeSpans: RuntimeSpan[];
}

/**
 * @deprecated Use useOutputStatements instead. 
 * This function now returns empty data as the tracker API has been removed.
 */
export function useTrackedSpans(runtime: IScriptRuntime | null): TrackedSpansData {
  // Return empty data - the tracker API is no longer available
  return useMemo(() => ({
    active: [],
    completed: [],
    byId: new Map(),
    byBlockId: new Map(),
    runtimeSpans: []
  }), []);
}

/**
 * @deprecated Use useOutputStatement instead
 */
export function useTrackedSpan(
  runtime: IScriptRuntime | null,
  id: string | null,
  byBlockId: boolean = false
): RuntimeSpan | null {
  return null;
}

/**
 * @deprecated Use useOutputHierarchy instead
 */
export function useSpanHierarchy(runtime: IScriptRuntime | null): Map<string, number> {
  return useMemo(() => new Map(), []);
}

