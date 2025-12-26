import { useState, useEffect, useMemo, useRef } from 'react';
import { IScriptRuntime } from '../../runtime/IScriptRuntime';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../../runtime/models/RuntimeSpan';
import { TypedMemoryReference } from '../../runtime/IMemoryReference';
import { IEvent } from '../../runtime/IEvent';

/**
 * Data structure returned by useTrackedSpans hook
 */
export interface TrackedSpansData {
  /** Currently active execution spans */
  active: RuntimeSpan[];
  /** Completed execution spans */
  completed: RuntimeSpan[];
  /** All spans indexed by ID for quick lookup */
  byId: Map<string, RuntimeSpan>;
  /** All spans indexed by blockId */
  byBlockId: Map<string, RuntimeSpan>;
  /** All runtime spans */
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
  const [runtimeSpans, setRuntimeSpans] = useState<RuntimeSpan[]>([]);
  const ownerIdRef = useRef(`useTrackedSpans-${crypto.randomUUID()}`);

  useEffect(() => {
    if (!runtime?.memory || !runtime?.eventBus) {
      setRuntimeSpans([]);
      return;
    }

    const ownerId = ownerIdRef.current;

    // Fetch all execution spans from memory
    const fetchSpans = () => {
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
      if (data?.ref?.type === RUNTIME_SPAN_TYPE) {
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
    const active: RuntimeSpan[] = [];
    const completed: RuntimeSpan[] = [];
    const byId = new Map<string, RuntimeSpan>();
    const byBlockId = new Map<string, RuntimeSpan>();

    for (const span of runtimeSpans) {
      // Index by ID
      byId.set(span.id, span);
      byBlockId.set(span.blockId, span);

      // Categorize by status
      if (span.isActive()) {
        active.push(span);
      } else {
        completed.push(span);
      }
    }

    return { active, completed, byId, byBlockId, runtimeSpans };
  }, [runtimeSpans]);

  return data;
}

/**
 * Hook to get a specific span by ID or block ID
 */
export function useTrackedSpan(
  runtime: IScriptRuntime | null,
  id: string | null,
  byBlockId: boolean = false
): RuntimeSpan | null {
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
  const { runtimeSpans } = useTrackedSpans(runtime);

  return useMemo(() => {
    const depthMap = new Map<string, number>();

    // Combine all spans and sort by start time
    const allSpans = [...runtimeSpans].sort((a, b) => a.startTime - b.startTime);

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
  }, [runtimeSpans]);
}
