import { ResultSpan, OutputEvent } from "@/core/timer.types";
import { useState } from "react";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";

export function useLocalResultSync(): EventSyncResult<ResultSpan[]> {
    
    const [results, setResults] = useState<ResultSpan[]>([]);
    const sync = (evnt: OutputEvent) => {
        if (evnt.eventType !== "WRITE_RESULT" || !evnt.bag?.result) {
            return;
        }

        setResults([...results, evnt.bag.result]); //so some math.
    };

    return [results, sync];
}