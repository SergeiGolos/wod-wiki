import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { IPublicSpanBehavior } from "../behaviors/IPublicSpanBehavior";
import { IInheritMetricsBehavior } from "../behaviors/IInheritMetricsBehavior";
import type { IMemoryReference } from "../memory";
import { IScriptRuntime } from "../IScriptRuntime";

/**
 * TimerBlock - Basic timing unit
 * 
 * Behaviors:
 * - PublicSpanBehavior
 * - InheritMetricsBehavior
 * - DurationEventHandler → Next on duration elapsed
 * - NextEventHandler → Pop after Next
 * 
 * Selection conditions:
 * - time: value > 0 (timed) and rounds not present
 * - If time < 0, prefer CountdownParentBlock instead
 */
export class TimerBlock extends RuntimeBlockWithMemoryBase implements IPublicSpanBehavior, IInheritMetricsBehavior {
    private _publicSpanRef?: IMemoryReference<IResultSpanBuilder>;
    private _inheritedMetricsRef?: IMemoryReference<RuntimeMetric[]>;
    private _durationRef?: IMemoryReference<number>;
    private _startTimeRef?: IMemoryReference<Date>;

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`⏱️ TimerBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // Get duration from metrics
        const timeMetric = this.initialMetrics.find(m =>
            m.values.some(v => v.type === 'time' && v.value !== undefined && v.value > 0)
        );
        const duration = timeMetric?.values.find(v => v.type === 'time')?.value || 0;

        // Initialize public span for children to reference
        this._publicSpanRef = this.allocateMemory<IResultSpanBuilder>(
            'span-root', 
            this.createPublicSpan(), 
            'public'
        );

        // Initialize inherited metrics from parent's public metrics
        this._inheritedMetricsRef = this.allocateMemory<RuntimeMetric[]>(
            'inherited-metrics', 
            this.getInheritedMetrics(), 
            'public'
        );

        // Track timing state
        this._durationRef = this.allocateMemory<number>('duration', duration, 'private');
        this._startTimeRef = this.allocateMemory<Date>('start-time', new Date(), 'private');

        console.log(`⏱️ TimerBlock initialized with ${duration}ms duration`);
    }

    public createPublicSpan(): IResultSpanBuilder {
        return {
            create: () => ({ 
                blockKey: this.key.toString(), 
                timeSpan: { 
                    start: this._startTimeRef?.get() ? { 
                        name: 'timer-start', 
                        timestamp: this._startTimeRef.get()!.getTime() 
                    } : undefined,
                    blockKey: this.key.toString()
                }, 
                metrics: this.getInheritedMetrics(), 
                duration: this._durationRef?.get() || 0
            }),
            getSpans: () => [],
            close: () => {
                console.log(`⏱️ TimerBlock timer completed`);
            },
            start: () => {
                if (this._startTimeRef) {
                    this._startTimeRef.set(new Date());
                }
                console.log(`⏱️ TimerBlock timer started`);
            },
            stop: () => {
                console.log(`⏱️ TimerBlock timer stopped`);
            }
        };
    }

    public getPublicSpanReference(): IMemoryReference<IResultSpanBuilder> | undefined {
        return this._publicSpanRef;
    }

    public getInheritedMetrics(): RuntimeMetric[] {
        // Get parent's public metrics-snapshot if available
        const parentPublicMetrics = this.findVisibleByType<RuntimeMetric[]>('metrics-snapshot');
        
        if (parentPublicMetrics.length > 0) {
            // Use parent's public metrics snapshot
            const parentMetrics = parentPublicMetrics[0].get() || [];
            return [...this.initialMetrics, ...parentMetrics];
        }

        // Fallback to own metrics if no parent metrics available
        return [...this.initialMetrics];
    }

    public getInheritedMetricsReference(): IMemoryReference<RuntimeMetric[]> | undefined {
        return this._inheritedMetricsRef;
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        // Use the public span as the primary spans builder
        return this.createPublicSpan();
    }

    protected createInitialHandlers(): IEventHandler[] {
        // TODO: Add DurationEventHandler for duration elapsed → Next
        // TODO: Add NextEventHandler → Pop after Next
        return [];
    }

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏱️ TimerBlock.onPush() - Starting timer`);
        void runtime;
        
        // Start the timer
        const span = this.getPublicSpanReference()?.get();
        if (span) {
            span.start();
        }

        // TODO: Schedule DurationEvent based on duration
        const duration = this._durationRef?.get() || 0;
        if (duration > 0) {
            console.log(`⏱️ TimerBlock scheduled for ${duration}ms`);
        }

        return [{ level: 'info', message: 'timer push', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏱️ TimerBlock.onNext() - Timer completed, popping`);
        void runtime;
        return [];
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏱️ TimerBlock.onPop() - Stopping timer`);
        void runtime;
        
        // Stop the timer
        const span = this.getPublicSpanReference()?.get();
        if (span) {
            span.stop();
        }
        return [{ level: 'info', message: 'timer pop', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    /**
     * Check if the duration has elapsed
     */
    public hasDurationElapsed(): boolean {
        const duration = this._durationRef?.get() || 0;
        const startTime = this._startTimeRef?.get();
        
        if (!startTime || duration <= 0) {
            return false;
        }

        const elapsed = Date.now() - startTime.getTime();
        return elapsed >= duration;
    }
}