import { IActionButton, OutputEvent } from "@/core/timer.types";
import { useState } from "react";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";


export function useButtonSync(target: string): EventSyncResult<IActionButton[] | undefined> {
    const [buttons, setButtons] = useState<IActionButton[] | undefined>([]);
    const sync = (evnt: OutputEvent) => {
        if (evnt.eventType !== "SET_DISPLAY" || evnt.bag?.target !== target) {
            return;
        }

        setButtons(evnt.bag?.buttons ?? undefined);
    };
    return [buttons, sync];
}
