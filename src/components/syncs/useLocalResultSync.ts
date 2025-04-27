import { ResultSpan, OutputEvent } from "@/core/timer.types";
import { useState } from "react";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";

export function useLocalResultSync(): EventSyncResult<ResultSpan[]> {
    const [results, setResults] = useState<ResultSpan[]>([]);
    const sync = (runtimeBlock: OutputEvent) => {
        console.log("LocalResultSync write:", runtimeBlock);
        if (runtimeBlock.eventType !== "RESULT_UPDATED") {
            return;
        }

        setResults(runtimeBlock.bag?.results ?? []); //so some math.
    };

    return [results, sync];
}