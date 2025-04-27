import { ActionButton, OutputEvent } from "@/core/timer.types";
import { useState } from "react";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";


export function useButtonSync(target: string): EventSyncResult<ActionButton[] | undefined> {
    const [buttons, setButtons] = useState<ActionButton[] | undefined>([]);
    const sync = (runtimeBlock: OutputEvent) => {
        if (runtimeBlock.eventType !== "SET_DISPLAY" || runtimeBlock.bag?.target !== target) {
            return;
        }

        setButtons(runtimeBlock.bag?.buttons ?? undefined);
    };
    return [buttons, sync];
}
