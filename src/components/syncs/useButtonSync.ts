import { OutputEvent } from "@/core/OutputEvent";
import { IActionButton } from "@/core/IActionButton";
import { useState } from "react";
import { EventSyncResult } from "@/core/runtime/EventSyncResult";


export function useButtonSync(target: string): EventSyncResult<IActionButton[] | undefined> {
    const [buttons, setButtons] = useState<IActionButton[] | undefined>([]);
    const sync = (evnt: OutputEvent) => {
        console.log(`🔄 useButtonSync(${target}) received event:`, {
            eventType: evnt.eventType,
            bagTarget: evnt.bag?.target,
            buttonsCount: evnt.bag?.buttons?.length || 0,
            buttons: evnt.bag?.buttons?.map((b: any) => b.label) || []
        });
        
        if (evnt.eventType !== "SET_DISPLAY" || evnt.bag?.target !== target) {
            console.log(`❌ useButtonSync(${target}) ignoring event - type: ${evnt.eventType}, target: ${evnt.bag?.target}`);
            return;
        }

        console.log(`✅ useButtonSync(${target}) setting buttons:`, evnt.bag?.buttons?.map((b: any) => b.label) || []);
        setButtons(evnt.bag?.buttons ?? undefined);
    };
    return [buttons, sync];
}
