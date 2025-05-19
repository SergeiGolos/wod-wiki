import { OutputEvent } from "@/core/OutputEvent";
import { useState, useEffect } from "react";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";

export function useClockDisplaySync(target: string): EventSyncResult<any> {
    const [display, setDisplay] = useState<any | null>(null);
    
    // Initialize the hook
    useEffect(() => {
        return () => {}; // Cleanup function
    }, [target]);
    
    const sync = (runtimeBlock: OutputEvent) => {
        // Log every event received            
        if (runtimeBlock.eventType !== "SET_CLOCK" || runtimeBlock.bag?.target !== target) {
            return;
        }
        
        // Set the display for the target component
        setDisplay(runtimeBlock.bag?.duration ?? null); //so some math.
    };

    return [display, sync];
}
