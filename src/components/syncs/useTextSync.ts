import { EventSyncResult } from "@/core/runtime/EventSyncResult";
import { OutputEvent } from "@/core/timer.types";
import { useState, useEffect } from "react";


export function useTextSync(target: string): EventSyncResult<any> {
    const [text, setText] = useState<any | null>(null);

    // Initialize the hook
    useEffect(() => {
        return () => {}; // Cleanup function
    }, [target]);

    const sync = (runtimeBlock: OutputEvent) => {
        // Log every event received            
        if (runtimeBlock.eventType !== "SET_TEXT" || runtimeBlock.bag?.target !== target) {
            return;
        }

        // Set the text for the target component
        setText(runtimeBlock.bag?.text ?? null); //so some math.
    };

    return [text, sync];
}
