import { useState, useEffect, useMemo, useRef } from 'react';
import { IScriptRuntime } from '../../runtime/IScriptRuntime';
import { TrackedSpan, isActiveSpan, EXECUTION_SPAN_TYPE } from '../../runtime/models/TrackedSpan';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../../runtime/models/RuntimeSpan';
import { TypedMemoryReference } from '../../runtime/IMemoryReference';
import { IEvent } from '../../runtime/IEvent';

/**
 * Data structure returned by useTrackedSpans hook
 */
export interface TrackedSpansData {
  /** Currently active execution spans (status === 'active') */
  active: TrackedSpan[];
  /** Completed execution spans (any non-active status) */
  completed: TrackedSpan[];
  /** All spans indexed by ID for quick lookup */
  byId: Map<string, TrackedSpan>;
  /** All spans indexed by blockId */
  byBlockId: Map<string, TrackedSpan>;
  /** All runtime spans (new model) */
  runtimeSpans: RuntimeSpan[];
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
 * @returns TrackedSpansData containing active, completed spans and index maps
 */
export function useTrackedSpans(runtime: IScriptRuntime | null): TrackedSpansData {
  const [spans, setSpans] = useState<TrackedSpan[]>([]);
  const [runtimeSpans, setRuntimeSpans] = useState<RuntimeSpan[]>([]);
  const ownerIdRef = useRef(`useTrackedSpans-${crypto.randomUUID()}`);

  useEffect(() => {
    if (!runtime?.memory || !runtime?.eventBus) {
      setSpans([]);
      setRuntimeSpans([]);
      return;
    }

    const ownerId = ownerIdRef.current;

    // Fetch all execution spans from memory
    const fetchSpans = () => {
      // Legacy spans
      const refs = runtime.memory.search({
        type: EXECUTION_SPAN_TYPE,
        id: null,
        ownerId: null,
        visibility: null
      });

      const fetchedSpans = refs
        .map(ref => runtime.memory.get(ref as TypedMemoryReference<TrackedSpan>))
        .filter((s): s is TrackedSpan => s !== null);

      setSpans(fetchedSpans);

      // New runtime spans
      const runtimeRefs = runtime.memory.search({
        type: RUNTIME_SPAN_TYPE,
        id: null,
        ownerId: null,
        visibility: null
      });

      const fetchedRuntimeSpans = runtimeRefs
        .map(ref => runtime.memory.get(ref as TypedMemoryReference<RuntimeSpan>))
        .filter((s): s is RuntimeSpan => s !== null);

      setRuntimeSpans(fetchedRuntimeSpans);
    };

    // Initial load
    fetchSpans();

    // Subscribe to memory events via EventBus
    const handleMemoryEvent = (event: IEvent) => {
      const data = event.data as { ref: { type: string } };
      if (data?.ref?.type === EXECUTION_SPAN_TYPE || data?.ref?.type === RUNTIME_SPAN_TYPE) {
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
  const data = useMemo<TrackedSpansData>(() => {
    const active: TrackedSpan[] = [];
    const completed: TrackedSpan[] = [];
    const byId = new Map<string, TrackedSpan>();
    const byBlockId = new Map<string, TrackedSpan>();

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

    return { active, completed, byId, byBlockId, runtimeSpans };
  }, [spans, runtimeSpans]);

  return data;
}

/**
 * Legacy compatibility hook - wraps useTrackedSpans to match useExecutionLog interface
 * 
 * @deprecated Use useTrackedSpans instead
 */
export function useExecutionLog(runtime: IScriptRuntime | null): { history: TrackedSpan[]; active: TrackedSpan[] } {
  const { active, completed } = useTrackedSpans(runtime);
  return { history: completed, active };
}

/**
 * Hook to get a specific span by ID or block ID
 */
export function useTrackedSpan(
  runtime: IScriptRuntime | null,
  id: string | null,
  byBlockId: boolean = false
): TrackedSpan | null {
  const { byId, byBlockId: byBlock } = useTrackedSpans(runtime);

  if (!id) return null;

  return byBlockId
    ? byBlock.get(id) ?? null
    : byId.get(id) ?? null;
}

/**
 * Hook to compute span hierarchy (parent-child relationships)
 */
export function useSpanHierarchy(runtime: IScriptRuntime | null): Map<string, number> {
  const { active, completed, runtimeSpans } = useTrackedSpans(runtime);

  return useMemo(() => {
    const depthMap = new Map<string, number>();

    // Combine all spans and sort by start time
    // If runtimeSpans are present, prefer them as they represent the new unified model
    const allSpans = runtimeSpans.length > 0
      ? [...runtimeSpans].sort((a, b) => a.startTime - b.startTime)
      : [...active, ...completed].sort((a, b) => a.startTime - b.startTime);

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
  }, [active, completed, runtimeSpans]);
}
