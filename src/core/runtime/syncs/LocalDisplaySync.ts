import { IRuntimeSync, OutputEvent, ResultSpan } from "@/core/timer.types";
import { useState } from "react";



export interface UseDisplaySyncResult {
    display: any | null;    
    setDisplay: IRuntimeSync;
}

export function useLocalDisplaySync() : UseDisplaySyncResult {
    const [display, setDisplay] = useState<any | null>(null);
    const sync = (runtimeBlock: OutputEvent) => {
        
        
        setDisplay(runtimeBlock); //so some math.
    }
    
    return { display, setDisplay : sync };
}


export interface UseResultSyncResult {
    results: ResultSpan[];    
    setResults: IRuntimeSync;
}

export function useLocalResultSync() : UseResultSyncResult {
    const [results, setResults] = useState<ResultSpan[]>([]);
    const sync = (runtimeBlock: OutputEvent) => {
        console.log("LocalResultSync write:", runtimeBlock);
        if (runtimeBlock.eventType !== "RESULT_UPDATED") {
            return;
        }
        
        setResults(runtimeBlock.bag?.results ?? []); //so some math.
    }
    
    return { results, setResults : sync };
}