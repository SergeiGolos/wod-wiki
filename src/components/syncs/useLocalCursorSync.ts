import { IRuntimeBlock, OutputEvent } from "@/core/timer.types";
import { useState } from "react";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";


export function useLocalCursorSync(): EventSyncResult<IRuntimeBlock | undefined> {
    const [cursor, setCursor] = useState<IRuntimeBlock | undefined>(undefined);
    const sync = (runtimeBlock: OutputEvent) => {
        if (runtimeBlock.eventType !== "SET_DISPLAY" || runtimeBlock.bag?.target !== "cursor") {
            return;
        }
        setCursor(runtimeBlock.bag?.cursor ?? undefined); //so some math.
    };

    return [cursor, sync];
}
