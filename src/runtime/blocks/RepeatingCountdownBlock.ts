import { RepeatingBlock } from "./RepeatingBlock";
import type { IMemoryReference } from "../memory";

export class RepeatingCountdownBlock extends RepeatingBlock {
    private _remainingRef?: IMemoryReference<number>;

    protected initializeMemory(): void {
        super.initializeMemory();
        const timeMetric = this.initialMetrics.find(m => m.values.some(v => v.type === 'time' && (v.value ?? 0) < 0));
        const total = Math.abs(timeMetric?.values.find(v => v.type === 'time')?.value || 0);
        this._remainingRef = this.allocate('countdown-remaining', total, 'private');
    }

    public tickCountdown(ms: number): boolean {
        const current = this._remainingRef?.get() || 0;
        const next = Math.max(0, current - (ms || 0));
        this._remainingRef?.set(next);
        return next === 0;
    }

    public isCountdownExpired(): boolean {
        return (this._remainingRef?.get() || 0) === 0;
    }
}
