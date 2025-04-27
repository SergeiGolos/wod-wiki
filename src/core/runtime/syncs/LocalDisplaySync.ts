import { IRuntimeBlock, IRuntimeSync, OutputEvent, ResultSpan } from "@/core/timer.types";
import { useState } from "react";




export function useLocalCursorSync() : EventSyncResult<IRuntimeBlock | undefined> {
    const [cursor, setCursor] = useState<IRuntimeBlock | undefined>(undefined);
    const sync = (runtimeBlock: OutputEvent) => {
        
        
        setCursor(runtimeBlock.bag?.cursor ?? undefined); //so some math.
    }
    
    return [cursor, sync];
}



export type EventSyncResult<T> = [
    value: T | null,    
    handler: IRuntimeSync
]

export function useClockDisplaySync(target: string) : EventSyncResult<any> {
    const [display, setDisplay] = useState<any | null>(null);
    const sync = (runtimeBlock: OutputEvent) => {
        if (runtimeBlock.eventType !== "SET_CLOCK" || runtimeBlock.bag?.target !== target) {
            return;
        }
        
        setDisplay(runtimeBlock.bag?.duration ?? null); //so some math.
    }
    
    return [display, sync];
}


export function useLocalResultSync() : EventSyncResult<ResultSpan[]> {
    const [results, setResults] = useState<ResultSpan[]>([]);
    const sync = (runtimeBlock: OutputEvent) => {
        console.log("LocalResultSync write:", runtimeBlock);
        if (runtimeBlock.eventType !== "RESULT_UPDATED") {
            return;
        }
        
        setResults(runtimeBlock.bag?.results ?? []); //so some math.
    }
    
    return [results, sync];
}