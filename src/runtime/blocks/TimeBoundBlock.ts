import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { IAllocateSpanBehavior } from "../behaviors/IAllocateSpanBehavior";
import { IDurationEventBehavior } from "../behaviors/IDurationEventBehavior";
import { IPopOnNextBehavior } from "../behaviors/IPopOnNextBehavior";
import { IJournalOnPopBehavior } from "../behaviors/IJournalOnPopBehavior";
import { IAllocateMetricsBehavior } from "../behaviors/IAllocateMetricsBehavior";
import type { IMemoryReference } from "../memory";
import { IScriptRuntime } from "../IScriptRuntime";

/**
 * TimeBoundBlock - Basic timing unit for duration-based workout segments.
 * 
 * Behaviors Used:
 * - AllocateSpanBehavior
 * - DurationEventBehavior  
 * - PopOnNextBehavior
 * - JournalOnPopBehavior
 * - AllocateMetrics
 */
export class TimeBoundBlock extends RuntimeBlockWithMemoryBase 
    implements IAllocateSpanBehavior, IDurationEventBehavior, IPopOnNextBehavior, IJournalOnPopBehavior, IAllocateMetricsBehavior {
    
    private _spanRef?: IMemoryReference<IResultSpanBuilder>;
    private _durationRef?: IMemoryReference<number>;
    private _startTimeRef?: IMemoryReference<Date>;
    private _elapsedTimeRef?: IMemoryReference<number>;
    private _metricsRef?: IMemoryReference<RuntimeMetric[]>;
    private _popOnNextRef?: IMemoryReference<boolean>;
    private _journalingEnabledRef?: IMemoryReference<boolean>;

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`⏰ TimeBoundBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // AllocateSpanBehavior
        this.initializeSpan('private');
        
        // DurationEventBehavior
        const timeMetric = this.initialMetrics.find(m =>
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        const duration = timeMetric?.values.find(v => v.type === 'time')?.value || 0;
        
        this._durationRef = this.allocateMemory<number>('duration', duration, 'private');
        this._startTimeRef = this.allocateMemory<Date>('start-time', new Date(), 'private');
        this._elapsedTimeRef = this.allocateMemory<number>('elapsed-time', 0, 'private');
        
        // AllocateMetrics
        this.initializeMetrics(this.initialMetrics);
        
        // PopOnNextBehavior
        this._popOnNextRef = this.allocateMemory<boolean>('pop-on-next', false, 'private');
        
        // JournalOnPopBehavior
        this._journalingEnabledRef = this.allocateMemory<boolean>('journaling-enabled', true, 'private');

        console.log(`⏰ TimeBoundBlock initialized with ${duration}ms duration`);
    }

    // IAllocateSpanBehavior implementation
    public getSpan(): IResultSpanBuilder | undefined {
        return this._spanRef?.get();
    }

    public setSpan(span: IResultSpanBuilder): void {
        this._spanRef?.set(span);
    }

    public createSpan(): IResultSpanBuilder {
        return {
            create: () => ({ 
                blockKey: this.key.toString(), 
                timeSpan: { 
                    start: this._startTimeRef?.get() ? { 
                        name: 'timebound-start', 
                        timestamp: this._startTimeRef.get()!.getTime() 
                    } : undefined,
                    blockKey: this.key.toString()
                }, 
                metrics: this.getMetrics(), 
                duration: this._durationRef?.get() || 0
            }),
            getSpans: () => [],
            close: () => {
                console.log(`⏰ TimeBoundBlock span completed`);
            },
            start: () => {
                this.startDuration();
            },
            stop: () => {
                this.stopDuration();
            }
        };
    }

    public getSpanReference(): IMemoryReference<IResultSpanBuilder> | undefined {
        return this._spanRef;
    }

    public initializeSpan(visibility: 'public' | 'private'): void {
        this._spanRef = this.allocateMemory<IResultSpanBuilder>(
            'span', 
            this.createSpan(), 
            visibility
        );
    }

    // IDurationEventBehavior implementation
    public getDuration(): number {
        return this._durationRef?.get() || 0;
    }

    public setDuration(duration: number): void {
        this._durationRef?.set(duration);
    }

    public getStartTime(): Date | undefined {
        return this._startTimeRef?.get();
    }

    public setStartTime(startTime: Date): void {
        this._startTimeRef?.set(startTime);
    }

    public getElapsedTime(): number {
        return this._elapsedTimeRef?.get() || 0;
    }

    public hasDurationElapsed(): boolean {
        const duration = this.getDuration();
        const elapsed = this.getElapsedTime();
        return duration > 0 && elapsed >= duration;
    }

    public startDuration(): void {
        this.setStartTime(new Date());
        this._elapsedTimeRef?.set(0);
        console.log(`⏰ TimeBoundBlock duration started`);
    }

    public stopDuration(): void {
        console.log(`⏰ TimeBoundBlock duration stopped`);
    }

    public tickDuration(currentTime?: Date): boolean {
        const startTime = this.getStartTime();
        if (!startTime) return false;
        
        const now = currentTime || new Date();
        const elapsed = now.getTime() - startTime.getTime();
        this._elapsedTimeRef?.set(elapsed);
        
        return this.hasDurationElapsed();
    }

    public getDurationReference(): IMemoryReference<number> | undefined {
        return this._durationRef;
    }

    // IPopOnNextBehavior implementation
    public shouldPopOnNext(): boolean {
        return this._popOnNextRef?.get() || false;
    }

    public markForPopOnNext(): void {
        this._popOnNextRef?.set(true);
    }

    public resetPopOnNextState(): void {
        this._popOnNextRef?.set(false);
    }

    // IJournalOnPopBehavior implementation
    public writeToJournal(): void {
        console.log(`⏰ TimeBoundBlock writing to journal`);
        // Implementation would write metrics and spans to persistent storage
    }

    public getJournalEntries(): any[] {
        return [];
    }

    public isJournalingEnabled(): boolean {
        return this._journalingEnabledRef?.get() || false;
    }

    public setJournalingEnabled(enabled: boolean): void {
        this._journalingEnabledRef?.set(enabled);
    }

    // IAllocateMetricsBehavior implementation
    public getMetrics(): RuntimeMetric[] {
        return this._metricsRef?.get() || [];
    }

    public setMetrics(metrics: RuntimeMetric[]): void {
        this._metricsRef?.set(metrics);
    }

    public addMetric(metric: RuntimeMetric): void {
        const current = this.getMetrics();
        this.setMetrics([...current, metric]);
    }

    public getMetricsReference(): IMemoryReference<RuntimeMetric[]> | undefined {
        return this._metricsRef;
    }

    public initializeMetrics(initialMetrics: RuntimeMetric[]): void {
        this._metricsRef = this.allocateMemory<RuntimeMetric[]>('metrics', initialMetrics, 'private');
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        return this.createSpan();
    }

    protected createInitialHandlers(): IEventHandler[] {
        // TODO: Add DurationEventHandler for duration elapsed
        return [];
    }

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏰ TimeBoundBlock.onPush() - Starting duration`);
        const span = this.getSpan();
        if (span) {
            span.start();
        }
        return [{ level: 'info', message: 'timebound push', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏰ TimeBoundBlock.onNext() - Duration completed`);
        this.markForPopOnNext();
        return [];
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏰ TimeBoundBlock.onPop() - Stopping duration and journaling`);
        
        // Stop duration
        const span = this.getSpan();
        if (span) {
            span.stop();
        }
        
        // Journal metrics and spans
        if (this.isJournalingEnabled()) {
            this.writeToJournal();
        }
        
        return [{ level: 'info', message: 'timebound pop', timestamp: new Date(), context: { key: this.key.toString() } }];
    }
}