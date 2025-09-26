import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { BoundedLoopingBlock } from "./BoundedLoopingBlock";
import { IPromotePublicBehavior } from "../behaviors/IPromotePublicBehavior";
import type { IMemoryReference } from "../memory";

/**
 * BoundedLoopingParentBlock - Iterates child statements across multiple rounds with repetition tracking; 
 * rep count is promoted to public for child elements to pick up during JIT.
 * 
 * Behaviors Used:
 * - AllocateSpanBehavior (inherited)
 * - AllocateChildren (inherited)
 * - AllocateIndex (inherited)
 * - NextChildBehavior (inherited)
 * - BoundLoopBehavior (inherited)
 * - PromotePublic (new)
 * - StopOnPopBehavior (inherited)
 * - JournalOnPopBehavior (inherited)
 */
export class BoundedLoopingParentBlock extends BoundedLoopingBlock implements IPromotePublicBehavior {
    private _publicMetricsRef?: IMemoryReference<RuntimeMetric[]>;

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`🔄👨‍👧‍👦 BoundedLoopingParentBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // Initialize parent memory first
        super.initializeMemory();
        
        // PromotePublic behavior - create public metrics snapshot
        const publicMetrics = this.createPublicMetricsSnapshot();
        this._publicMetricsRef = this.allocate<RuntimeMetric[]>(
            'metrics-snapshot', 
            publicMetrics, 
            'public'
        );

        console.log(`🔄👨‍👧‍👦 BoundedLoopingParentBlock initialized with public metrics promotion`);
    }

    // IPromotePublicBehavior implementation
    public createPublicMetricsSnapshot(): RuntimeMetric[] {
        // Promote metrics that children should inherit
        const metricsToPromote = this.initialMetrics.filter(metric => {
            // Promote metrics that are useful for children (like rep counts, timing, etc.)
            return metric.values.some(value => 
                value.type === 'repetitions' || 
                value.type === 'rounds' ||
                value.type === 'time'
            );
        });

        // Transform metrics for public consumption
        const publicMetrics = metricsToPromote.map(metric => ({
            sourceId: `${metric.sourceId}-public`,
            values: metric.values.map(value => {
                // For rep schemes like (21-15-9), promote different rep counts per round
                if (value.type === 'repetitions') {
                    const currentRound = this.getLoopIndex();
                    // This is a placeholder - real implementation would parse rep schemes
                    return { ...value, value: this.calculateRepsForRound(value.value, currentRound) };
                }
                return value;
            })
        }));

        console.log(`🔄👨‍👧‍👦 BoundedLoopingParentBlock promoted ${publicMetrics.length} metrics to public`);
        return publicMetrics;
    }

    public getPublicMetricsReference(): IMemoryReference<RuntimeMetric[]> | undefined {
        return this._publicMetricsRef;
    }

    /**
     * Calculate repetitions for a specific round based on rep schemes
     * This handles patterns like (21-15-9) where each round has different rep counts
     */
    private calculateRepsForRound(originalReps: number, round: number): number {
        // This is a placeholder implementation
        // Real implementation would parse rep scheme patterns and return appropriate values
        
        // Example for (21-15-9) pattern:
        if (originalReps === 21 && round === 0) return 21;
        if (originalReps === 21 && round === 1) return 15;
        if (originalReps === 21 && round === 2) return 9;
        
        // Default: return original reps
        return originalReps;
    }

    protected onNext(runtime: any): any[] {
        // Update public metrics snapshot for the new round
        const updatedMetrics = this.createPublicMetricsSnapshot();
        this._publicMetricsRef?.set(updatedMetrics);
        
        // Call parent onNext
        return super.onNext(runtime);
    }
}