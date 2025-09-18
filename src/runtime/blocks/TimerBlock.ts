import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RuntimeBlock } from "../RuntimeBlock";
import { AllocateSpanBehavior } from "../behaviors/AllocateSpanBehavior";
import { InheritMetricsBehavior } from "../behaviors/InheritMetricsBehavior";
import { DurationEventBehavior } from "../behaviors/DurationEventBehavior";
import { IScriptRuntime } from "../IScriptRuntime";
import type { IMemoryReference } from "../memory";

/**
 * TimerBlock - Basic timing unit
 * 
 * Behaviors:
 * - AllocateSpanBehavior (public span for children)
 * - InheritMetricsBehavior (inherit parent metrics)
 * - DurationEventBehavior (timer duration management)
 * 
 * Selection conditions:
 * - time: value > 0 (timed) and rounds not present
 * - If time < 0, prefer CountdownParentBlock instead
 */
export class TimerBlock extends RuntimeBlock {
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

        // Compose behaviors
        const spanBehavior = new AllocateSpanBehavior({
            visibility: 'public',
            factory: () => this.createPublicSpan(),
        });
        const inheritBehavior = new InheritMetricsBehavior(this.initialMetrics);
        const durationBehavior = new DurationEventBehavior(duration);

        this.behaviors.push(spanBehavior);
        this.behaviors.push(inheritBehavior);
        this.behaviors.push(durationBehavior);

        console.log(`⏱️ TimerBlock initialized with ${duration}ms duration`);
    }

    public createPublicSpan(): IResultSpanBuilder {
        return {
            create: () => ({ 
                blockKey: this.key.toString(), 
                timeSpan: { 
                    blockKey: this.key.toString()
                }, 
                metrics: this.getInheritedMetrics(), 
                duration: this.getDuration()
            }),
            getSpans: () => [],
            close: () => {
                console.log(`⏱️ TimerBlock timer completed`);
            },
            start: () => {
                console.log(`⏱️ TimerBlock timer started`);
            },
            stop: () => {
                console.log(`⏱️ TimerBlock timer stopped`);
            }
        };
    }

    public getInheritedMetrics(): RuntimeMetric[] {
        // Find inherit behavior and get metrics from it
        const inheritBehavior = this.behaviors.find(b => b instanceof InheritMetricsBehavior) as InheritMetricsBehavior;
        return inheritBehavior?.getInheritedMetrics() ?? [];
    }

    public getDuration(): number {
        // Find duration behavior and get duration from it
        const durationBehavior = this.behaviors.find(b => b instanceof DurationEventBehavior) as DurationEventBehavior;
        return durationBehavior?.getDuration() ?? 0;
    }

    public getPublicSpanReference(): IMemoryReference<IResultSpanBuilder> | undefined {
        // Find the span behavior and get reference from it
        const spanBehavior = this.behaviors.find(b => b instanceof AllocateSpanBehavior) as AllocateSpanBehavior;
        return spanBehavior?.getSpanReference();
    }

    public getInheritedMetricsReference(): IMemoryReference<RuntimeMetric[]> | undefined {
        // Find the inherit behavior and get reference from it
        const inheritBehavior = this.behaviors.find(b => b instanceof InheritMetricsBehavior) as InheritMetricsBehavior;
        return inheritBehavior?.getInheritedMetricsReference();
    }

    public hasDurationElapsed(): boolean {
        // Find duration behavior and check if elapsed
        const durationBehavior = this.behaviors.find(b => b instanceof DurationEventBehavior) as DurationEventBehavior;
        return durationBehavior?.hasDurationElapsed() ?? false;
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
        
        // Let behaviors handle the push
        const logs = super.onPush(runtime);
        
        // Start the timer through duration behavior
        const durationBehavior = this.behaviors.find(b => b instanceof DurationEventBehavior) as DurationEventBehavior;
        if (durationBehavior) {
            durationBehavior.startDuration();
        }

        console.log(`⏱️ TimerBlock scheduled for ${this.getDuration()}ms`);
        
        return [...logs, { level: 'info', message: 'timer push', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏱️ TimerBlock.onNext() - Timer completed, popping`);
        return super.onNext(runtime);
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`⏱️ TimerBlock.onPop() - Stopping timer`);
        
        // Let behaviors handle the pop
        const logs = super.onPop(runtime);
        
        // Stop the timer through duration behavior
        const durationBehavior = this.behaviors.find(b => b instanceof DurationEventBehavior) as DurationEventBehavior;
        if (durationBehavior) {
            durationBehavior.stopDuration();
        }
        
        return [...logs, { level: 'info', message: 'timer pop', timestamp: new Date(), context: { key: this.key.toString() } }];
    }
}