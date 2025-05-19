import { IRuntimeSync } from "../IRuntimeSync";


export type EventSyncResult<T> = [
    value: T | null,
    handler: IRuntimeSync
];
