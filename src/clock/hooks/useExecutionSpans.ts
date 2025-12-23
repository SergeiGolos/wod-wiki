import { useState, useEffect, useMemo, useRef } from 'react';
import { IScriptRuntime } from '../../runtime/IScriptRuntime';
import { ExecutionSpan, isActiveSpan, EXECUTION_SPAN_TYPE } from '../../runtime/models/ExecutionSpan';
import { TypedMemoryReference } from '../../runtime/IMemoryReference';
import { IEvent } from '../../runtime/IEvent';

/**
 * Data structure returned by useExecutionSpans hook
 */
export interface ExecutionSpansData {
  /** Currently active execution spans (status === 'active') */
  active: ExecutionSpan[];
  /** Completed execution spans (any non-active status) */
  completed: ExecutionSpan[];
  /** All spans indexed by ID for quick lookup */
  byId: Map<string, ExecutionSpan>;
  /** All spans indexed by blockId */
  byBlockId: Map<string, ExecutionSpan>;
}

/**
 * React hook that subscribes to execution span updates from a runtime.
 * 
 * This hook uses the EventBus to receive memory change notifications,
 * providing a unified event-driven approach.
 * 
 * Returns both active (currently executing) and completed execution spans,
 * along with indexed maps for quick lookup.
 * 
 * @param runtime The runtime instance to monitor (can be null)
 * @returns ExecutionSpansData containing active, completed spans and index maps
 */
export function useExecutionSpans(runtime: IScriptRuntime | null): ExecutionSpansData {
  const [spans, setSpans] = useState<ExecutionSpan[]>([]);
  const ownerIdRef = useRef(`useExecutionSpans-${crypto.randomUUID()}`);

  useEffect(() => {
    if (!runtime?.memory || !runtime?.eventBus) {
      setSpans([]);
      return;
    }

    const ownerId = ownerIdRef.current;

    // Fetch all execution spans from memory
    const fetchSpans = () => {
      const refs = runtime.memory.search({
        type: EXECUTION_SPAN_TYPE,
        id: null,
        ownerId: null,
        visibility: null
      });

      const fetchedSpans = refs
        .map(ref => runtime.memory.get(ref as TypedMemoryReference<ExecutionSpan>))
        .filter((s): s is ExecutionSpan => s !== null);

      setSpans(fetchedSpans);
    };

    // Initial load
    fetchSpans();

    // Subscribe to memory events via EventBus
    const handleMemoryEvent = (event: IEvent) => {
      const data = event.data as { ref: { type: string } };
      if (data?.ref?.type === EXECUTION_SPAN_TYPE) {
        fetchSpans();
      }
    };

    runtime.eventBus.on('memory:set', handleMemoryEvent, ownerId);
    runtime.eventBus.on('memory:allocate', handleMemoryEvent, ownerId);
    runtime.eventBus.on('memory:release', handleMemoryEvent, ownerId);

    return () => {
      runtime.eventBus.unregisterByOwner(ownerId);
    };
  }, [runtime]);

  // Compute derived data (memoized for performance)
  const data = useMemo<ExecutionSpansData>(() => {
    const active: ExecutionSpan[] = [];
    const completed: ExecutionSpan[] = [];
    const byId = new Map<string, ExecutionSpan>();
    const byBlockId = new Map<string, ExecutionSpan>();

    for (const span of spans) {
      // Index by ID
      byId.set(span.id, span);
      byBlockId.set(span.blockId, span);

      // Categorize by status
      if (isActiveSpan(span)) {
        active.push(span);
      } else {
        completed.push(span);
      }
    }

    return { active, completed, byId, byBlockId };
  }, [spans]);

  return data;
}

/**
 * Legacy compatibility hook - wraps useExecutionSpans to match useExecutionLog interface
 * 
 * @deprecated Use useExecutionSpans instead
 */
export function useExecutionLog(runtime: IScriptRuntime | null): { history: ExecutionSpan[]; active: ExecutionSpan[] } {
  const { active, completed } = useExecutionSpans(runtime);
  return { history: completed, active };
}

/**
 * Hook to get a specific span by ID or block ID
 */
export function useExecutionSpan(
  runtime: IScriptRuntime | null,
  id: string | null,
  byBlockId: boolean = false
): ExecutionSpan | null {
  const { byId, byBlockId: byBlock } = useExecutionSpans(runtime);

  if (!id) return null;

  return byBlockId
    ? byBlock.get(id) ?? null
    : byId.get(id) ?? null;
}

/**
 * Hook to compute span hierarchy (parent-child relationships)
 */
export function useSpanHierarchy(runtime: IScriptRuntime | null): Map<string, number> {
  const { active, completed, byId } = useExecutionSpans(runtime);

  return useMemo(() => {
    const depthMap = new Map<string, number>();

    // Combine and sort by start time
    const allSpans = [...active, ...completed].sort((a, b) => a.startTime - b.startTime);

    for (const span of allSpans) {
      if (!span.parentSpanId) {
        // Root span
        depthMap.set(span.id, 0);
      } else {
        // Child span - depth is parent + 1
        const parentDepth = depthMap.get(span.parentSpanId) ?? 0;
        depthMap.set(span.id, parentDepth + 1);
      }
    }

    return depthMap;
  }, [active, completed, byId]);
}
