import { EventSyncResult } from "@/core/runtime/EventSyncResult";
import { ResultSpan, OutputEvent } from "@/core/timer.types";
import { useState } from "react";


export function useLocalLogSync(): EventSyncResult<ResultSpan[]> {

    const [results, setResults] = useState<ResultSpan[]>([]);
    const sync = (evnt: OutputEvent) => {
        if (evnt.eventType !== "WRITE_LOG" || !evnt.bag?.log) {
            return;
        }

        setResults([evnt.bag.log, ...results]); //so some math.
    };

    return [results, sync];
}
