import { OutputEvent } from "@/core/OutputEvent";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { ResultSpan } from "@/core/ResultSpan"; // Import ResultSpan
import { useState } from "react";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";

export function useLocalResultSync(): EventSyncResult<ResultSpan[]> {
    
    const [results, setResults] = useState<ResultSpan[]>([]);
    const sync = (evnt: OutputEvent) => {
        if (evnt.eventType === "CLEAR_RESULTS") {
            setResults([]);
            return;
        }

        if (evnt.eventType !== "WRITE_RESULT" || !evnt.bag?.result) {
            return;
        }

        // Ensure evnt.bag.result is treated as a single RuntimeSpan and convert to ResultSpan
        const runtimeSpan = evnt.bag.result as RuntimeSpan;
        const resultSpan = new ResultSpan(runtimeSpan);
        
        setResults(prevResults => [...prevResults, resultSpan]);
    };

    return [results, sync];
}