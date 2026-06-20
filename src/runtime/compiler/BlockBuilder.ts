import { IRuntimeBehavior } from "../contracts/IRuntimeBehavior";
import { IBlockContext } from "../contracts/IBlockContext";
import { BlockKey } from "../../core/models/BlockKey";
import { IRuntimeBlock } from "../contracts/IRuntimeBlock";
import { RuntimeBlock } from "../RuntimeBlock";
import { IScriptRuntime } from "../contracts/IScriptRuntime";
import { IMetric, MetricType } from "../../core/models/Metric";
import { MetricContainer } from "../../core/models/MetricContainer";
import { MemoryLocation } from "../memory/MemoryLocation";
import { RestBlock } from "../blocks/RestBlock";
import { PushBlockAction } from "../actions/stack/PushBlockAction";
import {
    CompletionTimestampBehavior,
    CountupTimerBehavior,
    CountdownTimerBehavior, CountdownMode,
    SpanTrackingBehavior,
    ChildSelectionBehavior,
    ChildSelectionConfig,
    ChildSelectionLoopCondition
} from "../behaviors";


/** Legacy timer config shape — kept for call-site backward compatibility */
export interface TimerConfig {
    direction: 'up' | 'down';
    durationMs?: number;
    label?: string;
    role?: 'primary' | 'secondary' | 'hidden' | 'auto';
}

export interface TimerCompletionConfig {
    completesBlock?: boolean;
}

/** Round configuration stored by asRepeater() and forwarded by asContainer() */
export interface RepeaterConfig {
    totalRounds?: number;
    startRound?: number;
    addCompletion?: boolean;
}

/** @internal re-exported for backward compat */ 
export type { CountdownMode };

export class BlockBuilder {
    private behaviors: Map<any, IRuntimeBehavior> = new Map();
    private context: IBlockContext | undefined;
    private key: BlockKey | undefined;
    private label: string = "";
    private blockType: string = "Block";
    private metrics: MetricContainer[] | undefined;
    private sourceIds: number[] = [];
    /** Pending round config stored by asRepeater(), consumed by asContainer() */
    private pendingRoundConfig: RepeaterConfig | undefined;

    constructor(private runtime: IScriptRuntime) {}

    addBehavior(behavior: IRuntimeBehavior): BlockBuilder {

        // The user prompt implies "union".
        // But we also need "override".
        // Strategy: Key by constructor. High priority strategies run first and add behaviors.
        // If we want to prevent overwrite, we check hasBehavior.
        // If we want to allow multiples, we need a different storage.

        // Let's use a list but provide helpers to check existence.
        // "strategies return behaviors... union... compound block behavior"
        // If two strategies add SoundBehavior, we probably want both? Or merged?
        // Usually we want one SoundBehavior that handles all cues.
        // But TimerBehavior? Definitely only one.

        // Let's store in a list, but offer `removeBehavior` or `hasBehavior`.
        // Actually, for composition, usually "Last Write Wins" or "First Write Wins".
        // With Priority: High Priority runs FIRST. So "First Write Wins" prevents Low Priority from messing it up?
        // Or High Priority runs LAST and overwrites?
        // Standard Chain of Responsibility / Decorator:
        // Usually High Priority decides FIRST.
        // If `IntervalStrategy` (High) sets a Timer, `GenericTimer` (Low) should see it and skip.

        // So we need to be able to query.
        this.behaviors.set(behavior.constructor, behavior);
        return this;
    }

    /**
     * Adds a behavior only if one of that type doesn't already exist.
     */
    addBehaviorIfMissing(behavior: IRuntimeBehavior): BlockBuilder {
        if (!this.behaviors.has(behavior.constructor)) {
            this.behaviors.set(behavior.constructor, behavior);
        }
        return this;
    }

    /**
     * Remove a behavior by its constructor type.
     * Used by enhancement strategies to remove conflicting behaviors
    * added by earlier strategies (e.g., removing LeafExitBehavior
    * when child-selection behavior takes over completion management).
     */
    removeBehavior<T extends IRuntimeBehavior>(type: new (...args: any[]) => T): BlockBuilder {
        this.behaviors.delete(type);
        return this;
    }

    /**
     * Move an already-added behavior to the LAST position in the behavior list.
     *
     * Behavior order = Map insertion order = RuntimeBlock.onNext execution order.
     * When a later-running strategy needs a behavior added by an earlier
     * strategy to execute AFTER its own behaviors, this is the explicit API.
     * No-op when the behavior is not present (or already last).
     *
     * Replaces the previous `getBehavior → removeBehavior → addBehavior` dance
     * (e.g. ChildrenStrategy's MetricPromotion reorder) with a named contract.
     */
    moveBehaviorLast<T extends IRuntimeBehavior>(type: new (...args: any[]) => T): BlockBuilder {
        const behavior = this.behaviors.get(type);
        if (!behavior) return this;
        this.behaviors.delete(type);
        this.behaviors.set(type, behavior);
        return this;
    }

    hasBehavior<T extends IRuntimeBehavior>(type: new (...args: any[]) => T): boolean {
        return this.behaviors.has(type);
    }

    getBehavior<T extends IRuntimeBehavior>(type: new (...args: any[]) => T): T | undefined {
        return this.behaviors.get(type) as T | undefined;
    }

    setContext(context: IBlockContext): BlockBuilder {
        this.context = context;
        return this;
    }

    setKey(key: BlockKey): BlockBuilder {
        this.key = key;
        return this;
    }

    setLabel(label: string): BlockBuilder {
        this.label = label;
        return this;
    }

    setBlockType(type: string): BlockBuilder {
        this.blockType = type;
        return this;
    }

    setFragments(metrics: IMetric[][] | MetricContainer[]): BlockBuilder {
        // Hint metrics are semantic markers, not display fragments — drop them
        // so they never surface as block metrics.
        this.metrics = metrics.map(group => {
            const container = MetricContainer.from(group);
            container.removeByType(MetricType.Hint);
            return container;
        });
        return this;
    }

    setSourceIds(ids: number[]): BlockBuilder {
        this.sourceIds = ids;
        return this;
    }
    getLabel(): string {
        return this.label;
    }
    getBlockType(): string {
        return this.blockType;
    }
    getFragments(): MetricContainer[] | undefined {
        return this.metrics;
    }
    getSourceIds(): number[] {
        return this.sourceIds;
    }
    getContext(): IBlockContext | undefined {
        return this.context;
    }
    getKey(): BlockKey | undefined {
        return this.key;
    }

    // ============================================================================
    // Aspect Composer Methods - High-level composition helpers
    // ============================================================================

    /**
     * Timer Aspect Composer — assigns exactly ONE self-contained timer behavior.
     *
     * - `direction: 'down'` + `durationMs` → `CountdownTimerBehavior`
     *   (subscribes to tick, fires timer:complete, handles pause/resume)
     * - `direction: 'up'` or no duration → `CountupTimerBehavior`
     *   (tracks elapsed via spans, handles pause/resume, no completion signal)
     *
     * @param config Timer configuration
     * @returns This builder for chaining
     */
    asTimer(config: TimerConfig & {
        addCompletion?: boolean;
        completionConfig?: TimerCompletionConfig;
        injectRest?: boolean;
        required?: boolean;
    }): BlockBuilder {
        if (config.direction === 'down' && config.durationMs) {
            const mode: CountdownMode = config.completionConfig?.completesBlock === false
                ? 'reset-interval'
                : 'complete-block';

            // The `restBlockFactory` closure is a builder concern (it talks
            // to runtime/push-action plumbing that is not a behavior concern),
            // so it stays closed over here rather than moving into the behavior.
            this.addBehavior(new CountdownTimerBehavior({
                durationMs: config.durationMs,
                label: config.label,
                role: config.role,
                mode,
                required: config.required,
                restBlockFactory: config.injectRest ? (durationMs: number, label?: string) => {
                    const restBlock = new RestBlock(this.runtime, { durationMs, label });
                    return [new PushBlockAction(restBlock)];
                } : undefined
            }));
        } else {
            this.addBehavior(new CountupTimerBehavior({
                label: config.label,
                role: config.role
            }));
        }
        return this;
    }
    /**
     * Returns true if round config was stored via asRepeater().
     * Use this guard in strategies that must skip their iteration logic when rounds are already set.
     */
    hasRoundConfig(): boolean {
        return this.pendingRoundConfig !== undefined;
    }

    /**
     * Returns true if any timer behavior (countdown, countup, or span-only) is present.
     * Use this guard in strategies that must skip their timer logic when timer is already set.
     */
    hasTimerBehavior(): boolean {
        return (
            this.behaviors.has(CountdownTimerBehavior) ||
            this.behaviors.has(CountupTimerBehavior) ||
            this.behaviors.has(SpanTrackingBehavior)
        );
    }

    /**
     * Repeater Aspect Composer — stores round/iteration config to be forwarded
     * when asContainer() is called.
     *
     * Previously created ReEntryBehavior + RoundsEndBehavior directly; now the
     * config is absorbed into ChildSelectionBehavior via asContainer(), which
     * owns round state initialization and the overflow safety net.
     *
     * @param config Round configuration
     * @returns This builder for chaining
     */
    asRepeater(config: RepeaterConfig): BlockBuilder {
        this.pendingRoundConfig = {
            totalRounds: config.totalRounds,
            startRound: config.startRound ?? 1,
            addCompletion: config.addCompletion,
        };
        return this;
    }

    /**
     * Container Aspect Composer — adds ChildSelectionBehavior, incorporating any
     * round config stored by a prior asRepeater() call.
     *
     * @param config Container configuration
     * @returns This builder for chaining
     */
    asContainer(
        config: ChildSelectionConfig & {
            addLoop?: boolean;
            loopConfig?: { condition?: ChildSelectionLoopCondition };
        }
    ): BlockBuilder {
        const roundCfg = this.pendingRoundConfig;
        this.addBehavior(new ChildSelectionBehavior({
            childGroups: config.childGroups,
            loop: config.addLoop
                ? { condition: config.loopConfig?.condition ?? 'timer-active' }
                : false,
            injectRest: config.injectRest,
            skipOnMount: config.skipOnMount,
            // Forward round config from asRepeater() (absorbed from ReEntryBehavior)
            startRound: roundCfg?.startRound,
            totalRounds: roundCfg?.totalRounds,
        }));

        return this;
    }

    build(): IRuntimeBlock {
        if (!this.context) throw new Error("BlockContext is required");
        if (!this.key) throw new Error("BlockKey is required");

        // Add Universal Invariants - automatically added to ALL blocks
        // These behaviors are added implicitly and don't require strategy opt-in
        this.addBehaviorIfMissing(new CompletionTimestampBehavior());

        const block = new RuntimeBlock({
            runtime: this.runtime,
            sourceIds: this.sourceIds,
            behaviors: Array.from(this.behaviors.values()),
            context: this.context,
            key: this.key,
            blockType: this.blockType,
            // label is NOT passed here — it's pushed as a Label metrics below
        });

        // Push metrics memory preserving group structure from strategies
        if (this.metrics && this.metrics.length > 0) {
            // Push each metric group as a separate 'metric:display' location
            for (const group of this.metrics) {
                block.pushMemory(new MemoryLocation('metric:display', group));
            }
        }

        // Push label as a Label metrics in dedicated memory location
        if (this.label) {
            block.pushMemory(new MemoryLocation('metric:label', [{
                type: MetricType.Label,
                image: this.label,
                origin: 'compiler',
                value: this.label,
            } as IMetric]));
        }

        return block;
    }
}
