import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
// import { EventHandler, IRuntimeEvent } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RepeatingBlock } from "./RepeatingBlock";
import { IPromotePublicBehavior } from "../behaviors/IPromotePublicBehavior";
import type { IMemoryReference } from "../memory";

/**
 * RepeatingRepsBlock - Iterate child statements across N rounds with explicit repetitions aggregation
 * 
 * Behaviors:
 * - RepeatingBlockBehavior
 * - NextEventHandler
 * - PublicMetricBehavior (publish current reps count per round)
 * 
 * Selection conditions:
 * - rounds: value > 1
 * - repetitions: present (type === 'repetitions' with value defined)
 * - no countdown (time < 0) on the same block
 */
export class RepeatingRepsBlock extends RepeatingBlock implements IPromotePublicBehavior {
    private _publicMetricsRef?: IMemoryReference<RuntimeMetric[]>;
    private _currentRepsCountRef?: IMemoryReference<number>;

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`🔁 RepeatingRepsBlock created for key: ${key.toString()}`);
    }

    protected shouldExposeCurrentRound(): boolean {
        return true; // RepeatingRepsBlock needs to expose current round for rep counting
    }

    protected initializeMemory(): void {
        // Initialize parent RepeatingBlock memory
        super.initializeMemory();

        // Initialize public metrics snapshot for children
        this._publicMetricsRef = this.allocateMemory<RuntimeMetric[]>(
            'metrics-snapshot', 
            this.createPublicMetricsSnapshot(), 
            'private'
        );

        // Track current reps count per round (public for children)
        this._currentRepsCountRef = this.allocateMemory<number>(
            'current-reps-count', 
            0, 
            'public'
        );

        console.log(`🔁 RepeatingRepsBlock initialized with repetitions tracking`);
    }

    public createPublicMetricsSnapshot(): RuntimeMetric[] {
        // Create a snapshot that includes current reps information for children
        const snapshot = [...this.initialMetrics];
        
        // Add current reps count if available
        if (this._currentRepsCountRef) {
            const currentReps = this._currentRepsCountRef.get() || 0;
            snapshot.push({
                sourceId: 'current-reps',
                values: [{ type: 'repetitions', value: currentReps, unit: 'reps' }]
            });
        }

        return snapshot;
    }

    public getPublicMetricsReference(): IMemoryReference<RuntimeMetric[]> | undefined {
        return this._publicMetricsRef;
    }

    public advanceToNextChild(): void {
        // Call parent implementation
        super.advanceToNextChild();

        // Update reps count if we're tracking repetitions
        this.updateRepsCount();
    }

    private updateRepsCount(): void {
        if (!this._currentRepsCountRef) return;

        const state = this.getLoopState();
        
        // Calculate total reps based on round completion
        const totalRounds = this.initialMetrics.find(m =>
            m.values.some(v => v.type === 'rounds')
        )?.values.find(v => v.type === 'rounds')?.value || 1;
        
        const repsPerRound = this.initialMetrics.find(m =>
            m.values.some(v => v.type === 'repetitions')
        )?.values.find(v => v.type === 'repetitions')?.value || 1;

        const completedRounds = totalRounds - state.remainingRounds;
        const currentRoundReps = Math.floor(state.currentChildIndex / state.childStatements.length * repsPerRound);
        const totalReps = completedRounds * repsPerRound + currentRoundReps;

        this._currentRepsCountRef.set(totalReps);

        // Update public metrics snapshot
        if (this._publicMetricsRef) {
            this._publicMetricsRef.set(this.createPublicMetricsSnapshot());
        }

        // Also publish/update a single-object 'metric' entry for current reps to avoid array-only storage
        if (this.memory) {
            const ownerId = this.key.toString();
            const currentRepsSourceId = 'current-reps';
            const existing = this.memory
                .searchReferences<any>({ ownerId, type: 'metric' })
                .find(ref => {
                    const v = ref.get();
                    return v && v.sourceId === currentRepsSourceId && v.blockId === ownerId && v.type === 'repetitions';
                });

            const metricEntry = {
                sourceId: currentRepsSourceId,
                blockId: ownerId,
                type: 'repetitions' as const,
                value: totalReps,
                unit: 'reps'
            };

            if (existing) {
                existing.set(metricEntry);
            } else {
                this.memory.allocate('metric', ownerId, metricEntry, undefined, 'public');
            }
        }

        console.log(`🔁 RepeatingRepsBlock updated reps count: ${totalReps}`);
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        // Create a spans builder that tracks repetitions
        return {
            create: () => ({ 
                blockKey: this.key.toString(), 
                timeSpan: {}, 
                metrics: this.createPublicMetricsSnapshot(), 
                duration: 0 
            }),
            getSpans: () => [],
            close: () => {},
            start: () => {},
            stop: () => {}
        };
    }
}