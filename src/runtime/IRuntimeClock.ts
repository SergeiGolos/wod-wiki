import { ITickable } from './ITickable';

export interface RuntimeTimestamp {
    wallTimeMs: number;
    monotonicTimeMs: number;
}

export interface IRuntimeClock {
    readonly now: number;
    readonly isRunning: boolean;

    captureTimestamp(seed?: Partial<RuntimeTimestamp>): RuntimeTimestamp;
    start(): void;
    stop(): void;
    register(tickable: ITickable): void;
    unregister(tickable: ITickable): void;
    manualTick(timestamp: number): void;
}
