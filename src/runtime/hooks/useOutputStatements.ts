import { useState, useEffect, useMemo } from 'react';
import { useScriptRuntime } from '../context/RuntimeContext';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IOutputStatement } from '../../core/models/OutputStatement';

/**
 * Data structure returned by useOutputStatements hook
 * Consolidated from separate implementations in runtime/hooks and clock/hooks
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
 * Unified hook that works with or without a runtime parameter:
 * - useOutputStatements() - uses runtime from context
 * - useOutputStatements(runtime) - uses provided runtime parameter
 * 
 * Returns enriched OutputStatementsData with indexed maps for performance.
 * Consolidated from separate runtime/hooks and clock/hooks implementations.
 *
 * @param runtime Optional runtime instance. If not provided, uses context.
 * @returns OutputStatementsData containing outputs and indexed maps
 *
 * @example
 * ```tsx
 * // With context (default)
 * const data = useOutputStatements();
 * 
 * // With explicit runtime parameter
 * const data = useOutputStatements(myRuntime);
 * ```
 */
export function useOutputStatements(runtime?: IScriptRuntime | null): OutputStatementsData;
export function useOutputStatements(runtime: IScriptRuntime | null = null): OutputStatementsData {
  // Use context if runtime not provided
  const contextRuntime = runtime === undefined ? useScriptRuntime() : runtime;
  
  const [outputs, setOutputs] = useState<IOutputStatement[]>(() => {
    return contextRuntime?.getOutputStatements?.() ?? [];
  });

  useEffect(() => {
    if (!contextRuntime) {
      setOutputs([]);
      return;
    }

    // Initial load
    setOutputs(contextRuntime.getOutputStatements());

    // Subscribe to new output statements
    const unsubscribe = contextRuntime.subscribeToOutput?.(() => {
      setOutputs(contextRuntime.getOutputStatements());
    });

    return unsubscribe;
  }, [contextRuntime]);

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
