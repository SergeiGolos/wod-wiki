import { EventSyncResult } from "@/core/runtime/EventSyncResult";
import { useSync } from "./useSync";
import { RuntimeSpan } from "@/core/RuntimeSpan";


export function useClockSync(target: string): EventSyncResult<RuntimeSpan | undefined> {
    return useSync<RuntimeSpan | undefined>("SET_SPAN", target);
}
 
