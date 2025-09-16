import { RuntimeMetric } from "../RuntimeMetric";
import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import { EffortNextHandler } from "../handlers/EffortNextHandler";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { BlockKey } from "../../BlockKey";
import { IPublicSpanBehavior } from "../behaviors/IPublicSpanBehavior";
import { IInheritMetricsBehavior } from "../behaviors/IInheritMetricsBehavior";
import type { IMemoryReference } from "../memory";

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
export class EffortBlock extends RuntimeBlockWithMemoryBase implements IPublicSpanBehavior, IInheritMetricsBehavior {
    private _publicSpanRef?: IMemoryReference<IResultSpanBuilder>;
    private _inheritedMetricsRef?: IMemoryReference<RuntimeMetric[]>;

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`💪 EffortBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
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

    protected createInitialHandlers(): EventHandler[] {
        return [new EffortNextHandler()];
    }

    protected onPush(): IRuntimeEvent[] {
        console.log(`💪 EffortBlock.onPush() - Block pushed to stack`);
        return [];
    }

    protected onNext(): IRuntimeBlock | undefined {
        console.log(`💪 EffortBlock.onNext() - Determining next block after child completion`);
        // Effort blocks typically don't have child blocks
        return undefined;
    }

    protected onPop(): void {
        console.log(`💪 EffortBlock.onPop() - Block popped from stack, cleaning up`);
        // Handle completion logic for effort block
    }
}