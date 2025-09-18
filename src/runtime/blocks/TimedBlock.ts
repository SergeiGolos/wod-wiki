import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { IAllocateSpanBehavior } from "../behaviors/IAllocateSpanBehavior";
import { ICompleteEventBehavior } from "../behaviors/ICompleteEventBehavior";
import { IPopOnNextBehavior } from "../behaviors/IPopOnNextBehavior";
import { IJournalOnPopBehavior } from "../behaviors/IJournalOnPopBehavior";
import { IAllocateMetricsBehavior } from "../behaviors/IAllocateMetricsBehavior";
import type { IMemoryReference } from "../memory";
import { IScriptRuntime } from "../IScriptRuntime";

/**
 * TimedBlock - Segment that completes upon external signal rather than fixed duration.
 * 
 * Behaviors Used:
 * - AllocateSpanBehavior
 * - AllocateMetrics
 * - PopOnNextBehavior
 * - CompleteEventBehavior
 * - JournalOnPopBehavior
 */
export class TimedBlock extends RuntimeBlockWithMemoryBase 
    implements IAllocateSpanBehavior, ICompleteEventBehavior, IPopOnNextBehavior, IJournalOnPopBehavior, IAllocateMetricsBehavior {
    
    private _spanRef?: IMemoryReference<IResultSpanBuilder>;
    private _metricsRef?: IMemoryReference<RuntimeMetric[]>;
    private _popOnNextRef?: IMemoryReference<boolean>;
    private _journalingEnabledRef?: IMemoryReference<boolean>;
    private _completeEventRef?: IMemoryReference<boolean>;

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`⏱️ TimedBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // AllocateSpanBehavior
        this.initializeSpan('private');
        
        // AllocateMetrics
        this.initializeMetrics(this.initialMetrics);
        
        // PopOnNextBehavior
        this._popOnNextRef = this.allocateMemory<boolean>('pop-on-next', false, 'private');
        
        // JournalOnPopBehavior
        this._journalingEnabledRef = this.allocateMemory<boolean>('journaling-enabled', true, 'private');
        
        // CompleteEventBehavior
        this._completeEventRef = this.allocateMemory<boolean>('complete-event-received', false, 'private');

        console.log(`⏱️ TimedBlock initialized`);
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
                    blockKey: this.key.toString()
                }, 
                metrics: this.getMetrics(), 
                duration: 0
            }),
            getSpans: () => [],
            close: () => {
                console.log(`⏱️ TimedBlock span completed`);
            },
            start: () => {
                console.log(`⏱️ TimedBlock span started`);
            },
            stop: () => {
                console.log(`⏱️ TimedBlock span stopped`);
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

    // ICompleteEventBehavior implementation
    public isCompleteEventReceived(): boolean {
        return this._completeEventRef?.get() || false;
    }

    public markCompleteEventReceived(): void {
        this._completeEventRef?.set(true);
        console.log(`⏱️ TimedBlock complete event received`);
    }

    public resetCompleteEventState(): void {
        this._completeEventRef?.set(false);
    }

    public handleCompleteEvent(): void {
        console.log(`⏱️ TimedBlock handling complete event`);
        // End current span if open
        const span = this.getSpan();
        if (span) {
            span.stop();
        }
        
        // Mark for pop on next
        this.markForPopOnNext();
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
        console.log(`⏱️ TimedBlock writing to journal`);
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
        // TODO: Add CompleteEventHandler to listen for complete events
        return [];
    }

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏱️ TimedBlock.onPush() - Starting and waiting for complete event`);
        const span = this.getSpan();
        if (span) {
            span.start();
        }
        return [{ level: 'info', message: 'timed push', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏱️ TimedBlock.onNext() - Completed via external signal`);
        this.markForPopOnNext();
        return [];
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏱️ TimedBlock.onPop() - Stopping and journaling`);
        
        // Stop span
        const span = this.getSpan();
        if (span) {
            span.stop();
        }
        
        // Journal metrics and spans
        if (this.isJournalingEnabled()) {
            this.writeToJournal();
        }
        
        return [{ level: 'info', message: 'timed pop', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    /**
     * External method to trigger completion
     * This would be called by a button press or external event
     */
    public triggerComplete(): void {
        this.markCompleteEventReceived();
        this.handleCompleteEvent();
    }
}