import { IRuntimeSync } from "@/core/timer.types";


export type EventSyncResult<T> = [
    value: T | null,
    handler: IRuntimeSync
];
