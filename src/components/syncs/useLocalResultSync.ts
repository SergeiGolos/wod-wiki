import { OutputEvent } from "@/core/OutputEvent";
import { RuntimeSpan } from "@/core/RuntimeSpan";
import { ResultSpan } from "@/core/ResultSpan"; // Import ResultSpan
import { useState } from "react";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";
import { BlockKey } from "@/core/BlockKey";

// Helper to create a unique ID for a span based on its key characteristics
const getSpanUniqueId = (span: ResultSpan): string => {
    const blockKeyStr = span.blockKey?.toString() || 'unknown';
    const index = span.index !== undefined ? span.index : -1;
    // Get timestamp from the start event if it exists
    const startTime = span.timeSpans[0]?.start?.timestamp?.getTime() || 0;
    return `${blockKeyStr}_${index}_${startTime}`;
};

export function useLocalResultSync(): EventSyncResult<ResultSpan[]> {
    const [results, setResults] = useState<ResultSpan[]>([]);
    
    // Keep track of processed spans to avoid duplicates
    const [processedSpanIds] = useState<Set<string>>(new Set());
    
    const sync = (evnt: OutputEvent) => {
        console.log("[useLocalResultSync] received event", evnt);
        
        if (evnt.eventType === "CLEAR_RESULTS") {
            console.log("[useLocalResultSync] clearing all results");
            processedSpanIds.clear();
            setResults([]);
            return;
        }

        if (evnt.eventType !== "WRITE_RESULT" || !evnt.bag?.result) {
            return;
        }

        // Ensure evnt.bag.result is treated as a single RuntimeSpan and convert to ResultSpan
        const runtimeSpan = evnt.bag.result as RuntimeSpan;
        const resultSpan = new ResultSpan(runtimeSpan);
        
        // Generate a unique ID for this span
        const spanId = getSpanUniqueId(resultSpan);
        
        // Debug log the span being processed
        console.log(`[useLocalResultSync] processing span ${spanId}`, {
            blockKey: resultSpan.blockKey?.toString(),
            index: resultSpan.index,
            leaf: resultSpan.leaf,
            metrics: resultSpan.metrics,
            isProcessed: processedSpanIds.has(spanId)
        });
        
        // Skip if we've already processed this exact span
        if (processedSpanIds.has(spanId)) {
            console.log(`[useLocalResultSync] skipping duplicate span ${spanId}`);
            return;
        }
        
        // Add to processed set and update results
        processedSpanIds.add(spanId);
        
        setResults(prevResults => {
            const updated = [...prevResults, resultSpan];
            console.log("[useLocalResultSync] results updated", 
                updated.map(r => ({
                    id: getSpanUniqueId(r),
                    key: r.blockKey?.toString(),
                    leaf: r.leaf,
                    metrics: r.metrics.map(m => m.effort)
                }))
            );
            return updated;
        });
    };

    return [results, sync];
}