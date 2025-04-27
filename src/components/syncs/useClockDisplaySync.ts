import { OutputEvent } from "@/core/timer.types";
import { useState } from "react";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";


export function useClockDisplaySync(target: string): EventSyncResult<any> {
    const [display, setDisplay] = useState<any | null>(null);
    const sync = (runtimeBlock: OutputEvent) => {
        if (runtimeBlock.eventType !== "SET_CLOCK" || runtimeBlock.bag?.target !== target) {
            return;
        }

        setDisplay(runtimeBlock.bag?.duration ?? null); //so some math.
    };

    return [display, sync];
}
