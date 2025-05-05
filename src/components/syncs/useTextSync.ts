import { EventSyncResult } from "@/core/runtime/EventSyncResult";
import { OutputEvent } from "@/core/timer.types";
import { useState, useEffect } from "react";


export function useTextSync(target: string): EventSyncResult<any> {
    const [text, setText] = useState<any | null>(null);

    // Debug log when this hook renders
    useEffect(() => {
        console.debug(`useTextSync initialized for target: ${target}`);
        return () => console.debug(`useTextSync for target ${target} unmounted`);
    }, [target]);

    const sync = (runtimeBlock: OutputEvent) => {
        // Log every event received            
        if (runtimeBlock.eventType !== "SET_TEXT" || runtimeBlock.bag?.target !== target) {
            return;
        }

        console.debug(`Setting text for ${target} :`, runtimeBlock.bag?.text);
        setText(runtimeBlock.bag?.text ?? null); //so some math.
    };

    return [text, sync];
}
