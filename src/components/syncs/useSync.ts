import { OutputEvent } from "@/core/OutputEvent";
import { OutputEventType } from "@/core/OutputEventType";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";
import { useState } from "react";

export function useSync<T>(eventName: OutputEventType, target: string): EventSyncResult<T> {
    const [state, setState] = useState<T | undefined>();    const sync = (event: OutputEvent) => {
        // Log every event received
        if (event.eventType !== eventName || event.bag?.target !== target) {
            return;
        }

        // Set the display for the target component
        setState(event.bag?.data as T); // Cast to T
    };

    return [state, sync];
}
