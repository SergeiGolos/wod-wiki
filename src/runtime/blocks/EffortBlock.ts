import { RuntimeMetric } from "../RuntimeMetric";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { EffortNextHandler } from "../handlers/EffortNextHandler";
import { BlockKey } from "../../BlockKey";
import type { IMemoryReference } from "../memory";
import { RuntimeBlock } from "../RuntimeBlock";
import { AllocateSpanBehavior } from "../behaviors/AllocateSpanBehavior";
import { InheritMetricsBehavior } from "../behaviors/InheritMetricsBehavior";
import type { IRuntimeMemory } from "../memory/IRuntimeMemory";

/**
 * EffortBlock - Single effort unit
 * 
 * Behaviors:
 * - PublicSpanBehavior
 * - InheritMetricsBehavior
 * - NextEventHandler → Pop on Next (EffortNextHandler)
 * 
 * Selection conditions:
 * - Default when no other specialized strategy matches
 * - Presence of action/effort/distance/resistance/etc. without control metrics (rounds/time) is typical
 */
export class EffortBlock extends RuntimeBlock {
    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`💪 EffortBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // Compose behaviors: Allocate a public span and inherit metrics snapshot
        const spanBehavior = new AllocateSpanBehavior({
            visibility: 'public',
            factory: () => this.createPublicSpan(),
        });
        const inheritBehavior = new InheritMetricsBehavior(this.initialMetrics);
        
        this.behaviors.push(spanBehavior);
        this.behaviors.push(inheritBehavior);
        
        console.log(`💪 EffortBlock initialized memory for: ${this.key.toString()}`);
    }

    public createPublicSpan(): IResultSpanBuilder {
        return {
            create: () => ({ 
                blockKey: this.key.toString(), 
                timeSpan: {}, 
                metrics: this.getInheritedMetrics(), 
                duration: 0 
            }),
            getSpans: () => [],
            close: () => {
                console.log(`💪 EffortBlock effort completed`);
            },
            start: () => {
                console.log(`💪 EffortBlock effort started`);
            },
            stop: () => {
                console.log(`💪 EffortBlock effort stopped`);
            }
        };
    }

    public getPublicSpanReference(): IMemoryReference<IResultSpanBuilder> | undefined {
        // Find the span behavior and get reference from it
        const spanBehavior = this.behaviors.find(b => b instanceof AllocateSpanBehavior) as AllocateSpanBehavior;
        return spanBehavior?.getSpanReference();
    }

    public getInheritedMetrics(): RuntimeMetric[] {
        // Delegate to the inherit behavior
        const inheritBehavior = this.behaviors.find(b => b instanceof InheritMetricsBehavior) as InheritMetricsBehavior;
        return inheritBehavior?.getInheritedMetrics() ?? [];
    }

    public getInheritedMetricsReference(): IMemoryReference<RuntimeMetric[]> | undefined {
        // Delegate to the inherit behavior
        const inheritBehavior = this.behaviors.find(b => b instanceof InheritMetricsBehavior) as InheritMetricsBehavior;
        return inheritBehavior?.getInheritedMetricsReference();
    }

    protected createSpansBuilder(): IResultSpanBuilder { return this.createPublicSpan(); }

    protected createInitialHandlers(): IEventHandler[] {
        return [new EffortNextHandler()];
    }

    protected onPush(runtime: any): IRuntimeLog[] { const logs = super.onPush(runtime); console.log(`💪 EffortBlock.onPush() - Block pushed to stack`); return logs; }
    protected onNext(runtime: any): IRuntimeLog[] { const logs = super.onNext(runtime); console.log(`💪 EffortBlock.onNext() - Determining next block after child completion`); return logs; }
    protected onPop(runtime: any): IRuntimeLog[] { const logs = super.onPop(runtime); console.log(`💪 EffortBlock.onPop() - Block popped from stack, cleaning up`); return logs; }
}