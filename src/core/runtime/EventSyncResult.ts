import { IRuntimeSync } from "../IRuntimeSync";


export type EventSyncResult<T> = [
    value: T | undefined,
    handler: IRuntimeSync
];
