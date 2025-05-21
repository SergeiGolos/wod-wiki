import { EventSyncResult } from "@/core/runtime/EventSyncResult";
import { OutputEvent } from "@/core/OutputEvent";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { useState } from "react";


export function useLocalLogSync(): EventSyncResult<RuntimeSpan[]> {

    const [results, setResults] = useState<RuntimeSpan[]>([]);
    const sync = (evnt: OutputEvent) => {
        if (evnt.eventType !== "WRITE_LOG" || !evnt.bag?.log) {
            return;
        }

        setResults([evnt.bag.log, ...results]); //so some math.
    };

    return [results, sync];
}
