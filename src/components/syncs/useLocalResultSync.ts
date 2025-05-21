import { OutputEvent } from "@/core/OutputEvent";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { useState } from "react";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";

export function useLocalResultSync(): EventSyncResult<RuntimeSpan[]> {
    
    const [results, setResults] = useState<RuntimeSpan[]>([]);
    const sync = (evnt: OutputEvent) => {
        if (evnt.eventType === "CLEAR_RESULTS") {
            setResults([]);
            return;
        }

        if (evnt.eventType !== "WRITE_RESULT" || !evnt.bag?.result) {
            return;
        }

        // Ensure evnt.bag.result is treated as a single ResultSpan to be added
        // If evnt.bag.result could be an array, this logic might need adjustment
        // based on how WriteResultAction actually populates it.
        // Assuming evnt.bag.result is a single ResultSpan based on WriteResultAction's map.
        setResults(prevResults => [...prevResults, evnt.bag.result as RuntimeSpan]);
    };

    return [results, sync];
}