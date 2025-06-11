import { EventSyncResult } from "@/core/runtime/EventSyncResult";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { useSync } from "./useSync";



export function useSpanSync(target: string): EventSyncResult<RuntimeSpan | undefined> {
    return useSync<RuntimeSpan | undefined>("SET_SPAN", target);
}
