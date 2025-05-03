import { OutputEvent } from "@/core/timer.types";
import { useState, useEffect } from "react";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";


export function useClockDisplaySync(target: string): EventSyncResult<any> {
    const [display, setDisplay] = useState<any | null>(null);
    
    // Debug log when this hook renders
    useEffect(() => {
        console.debug(`useClockDisplaySync initialized for target: ${target}`);
        return () => console.debug(`useClockDisplaySync for target ${target} unmounted`);
    }, [target]);
    
    const sync = (runtimeBlock: OutputEvent) => {
        // Log every event received            
        if (runtimeBlock.eventType !== "SET_CLOCK" || runtimeBlock.bag?.target !== target) {
            return;
        }
        
        console.debug(`Setting display for ${target} :`, runtimeBlock.bag?.duration);
        setDisplay(runtimeBlock.bag?.duration ?? null); //so some math.
    };

    return [display, sync];
}
