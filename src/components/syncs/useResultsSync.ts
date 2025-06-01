import { EventSyncResult } from "@/core/runtime/EventSyncResult";
import { useLog } from "./useLog";
import { RuntimeSpan } from "@/core/RuntimeSpan";

/**
 * React hook that syncs with PUSH_RESULTS and CLEAR_RESULTS events.
 * Maintains the global results array for the unified results panel.
 * 
 * @returns An array containing [results, sync] where results is the current ResultSpan array, and sync is the event handler
 */
export function useResultsSync(): EventSyncResult<RuntimeSpan[]> {
    return useLog<RuntimeSpan>("WRITE_RESULT");
}

