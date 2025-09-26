import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { RepeatingBlock } from "./RepeatingBlock";
import type { IMemoryReference } from "../memory";
import { IResultSpanBuilder } from "../ResultSpanBuilder";

export class RepeatingTimedBlock extends RepeatingBlock {
    private _publicSpanRef?: IMemoryReference<IResultSpanBuilder>;
    private _durationRef?: IMemoryReference<number>;

    protected initializeMemory(): void {
        super.initializeMemory();
        const timeMetric = this.initialMetrics.find(m => m.values.some(v => v.type === 'time' && (v.value ?? 0) > 0));
        const duration = timeMetric?.values.find(v => v.type === 'time')?.value || 0;
        this._durationRef = this.allocate('duration', duration, 'private');
        this._publicSpanRef = this.allocate('span-root', this.createPublicSpan(), 'public');
    }

    public createPublicSpan(): IResultSpanBuilder {
        return {
            create: () => ({ blockKey: this.key.toString(), timeSpan: { blockKey: this.key.toString() }, metrics: [], duration: this._durationRef?.get() || 0 }),
            getSpans: () => [],
            close: () => void 0,
            start: () => void 0,
            stop: () => void 0,
        };
    }

    public getPublicSpanReference() { return this._publicSpanRef; }
}
