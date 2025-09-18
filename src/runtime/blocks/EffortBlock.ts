import { RuntimeMetric } from "../RuntimeMetric";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { EffortNextHandler } from "../handlers/EffortNextHandler";
import { BlockKey } from "../../BlockKey";
import type { IMemoryReference } from "../memory";
import { BehavioralMemoryBlockBase } from "./BehavioralMemoryBlockBase";
import { AllocateSpanBehavior } from "../behaviors/AllocateSpanBehavior";
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
export class EffortBlock extends BehavioralMemoryBlockBase {
    private _inheritedMetricsRef?: IMemoryReference<RuntimeMetric[]>;

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
        this.getBehaviors().push(spanBehavior);

        // Allocate inherited metrics snapshot as a private array
        this._inheritedMetricsRef = this.allocateMemory<RuntimeMetric[]>(
            'inherited-metrics',
            this.getInheritedMetrics(),
            'private'
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
        const mem = (this as any).memory as IRuntimeMemory | undefined;
        if (!mem) return undefined;
        const refs = mem.searchReferences<IResultSpanBuilder>({ ownerId: this.key.toString(), type: 'span-root' });
        return refs[0];
    }

    public getInheritedMetrics(): RuntimeMetric[] {
    // Preferred path: compose from visible metric items (single-object references)
    const metricEntries = this.findVisibleByType<any>('metric');
        if (metricEntries.length > 0) {
            const entries = metricEntries
                .map(ref => ref.get())
                .filter(Boolean) as Array<{ sourceId: string; type: any; value: any; unit: string }>;

            // Group by sourceId to form RuntimeMetric objects
            const bySource = new Map<string, RuntimeMetric>();
            for (const e of entries) {
                const rm = bySource.get(e.sourceId) || { sourceId: e.sourceId, values: [] };
                rm.values.push({ type: e.type, value: e.value, unit: e.unit });
                bySource.set(e.sourceId, rm);
            }
            // Use visible metric values as the source of truth to avoid duplicates
            return Array.from(bySource.values());
        }

        // Fallback: legacy public metrics array if present
        const parentPublicMetrics = this.findVisibleByType<RuntimeMetric[]>('metrics-snapshot');
        if (parentPublicMetrics.length > 0) {
            const parentMetrics = parentPublicMetrics[0].get() || [];
            return [...this.initialMetrics, ...parentMetrics];
        }

        // Fallback to own metrics if no parent metrics available
        return [...this.initialMetrics];
    }

    public getInheritedMetricsReference(): IMemoryReference<RuntimeMetric[]> | undefined {
        return this._inheritedMetricsRef;
    }

    protected createSpansBuilder(): IResultSpanBuilder { return this.createPublicSpan(); }

    protected createInitialHandlers(): IEventHandler[] {
        return [new EffortNextHandler()];
    }

    protected onPush(runtime: any): IRuntimeLog[] { const logs = super.onPush(runtime); console.log(`💪 EffortBlock.onPush() - Block pushed to stack`); return logs; }
    protected onNext(runtime: any): IRuntimeLog[] { const logs = super.onNext(runtime); console.log(`💪 EffortBlock.onNext() - Determining next block after child completion`); return logs; }
    protected onPop(runtime: any): IRuntimeLog[] { const logs = super.onPop(runtime); console.log(`💪 EffortBlock.onPop() - Block popped from stack, cleaning up`); return logs; }
}