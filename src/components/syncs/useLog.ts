import { OutputEvent } from "@/core/OutputEvent";
import { OutputEventType } from "@/core/OutputEventType";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";
import { useState } from "react";


export function useLog<T>(eventName: OutputEventType): EventSyncResult<T[]> {
    const [state, setState] = useState<T[]>([]);
    const sync = (event: OutputEvent) => {
        // Log every event received
        if (event.eventType !== eventName && event.bag) {
            return;
        }

        // Append the data to the log for the target component
        setState((prev) => [...prev, event.bag?.data as T]); // Cast to T
    };
    return [state, sync];
}
