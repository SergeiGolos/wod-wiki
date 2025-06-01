import { EventSyncResult } from "@/core/runtime/EventSyncResult";
import { useSync } from "./useSync";
import { IActionButton } from "@/core/IActionButton";


export function useButtonSync(target: string): EventSyncResult<IActionButton[] | undefined> {
    return useSync<IActionButton[] | undefined>("SET_BUTTON", target);
}
