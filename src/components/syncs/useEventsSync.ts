import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";
import { useLog } from "./useLog";


export function useEventsSync(): EventSyncResult<IRuntimeEvent[]> {
    return useLog<IRuntimeEvent>("WRITE_LOG");
}
