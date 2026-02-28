import { IRuntimeBehavior } from "../contracts/IRuntimeBehavior";
import { IBlockContext } from "../contracts/IBlockContext";
import { BlockKey } from "../../core/models/BlockKey";
import { IRuntimeBlock } from "../contracts/IRuntimeBlock";
import { RuntimeBlock } from "../RuntimeBlock";
import { IScriptRuntime } from "../contracts/IScriptRuntime";
import { ICodeFragment, FragmentType } from "../../core/models/CodeFragment";
import { MemoryLocation } from "../memory/MemoryLocation";
import {
    CompletionTimestampBehavior,
    CountupTimerBehavior,
    CountdownTimerBehavior, CountdownMode,
    SpanTrackingBehavior,
    ReEntryBehavior, ReEntryConfig,
    RoundsEndBehavior,
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

/** @internal re-exported for backward compat */ 
export type { CountdownMode };

export class BlockBuilder {
    private behaviors: Map<any, IRuntimeBehavior> = new Map();
    private context: IBlockContext | undefined;
    private key: BlockKey | undefined;
    private label: string = "";
    private blockType: string = "Block";
    private fragments: ICodeFragment[][] | undefined;
    private sourceIds: number[] = [];

    constructor(private runtime: IScriptRuntime) { }

    addBehavior(behavior: IRuntimeBehavior): BlockBuilder {
        // Key by constructor to allow replacement by type
        // However, we might want multiple behaviors of the same type?
        // For now, let's assume one behavior per type is the rule for things like Timers/Loops.
        // But ActionLayer, Sound, etc might be additive?
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

    setFragments(fragments: ICodeFragment[][]): BlockBuilder {
        this.fragments = fragments;
        return this;
    }

    setSourceIds(ids: number[]): BlockBuilder {
        this.sourceIds = ids;
        return this;
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
    asTimer(config: TimerConfig & { addCompletion?: boolean; completionConfig?: TimerCompletionConfig }): BlockBuilder {
        if (config.direction === 'down' && config.durationMs) {
            const mode: CountdownMode = config.completionConfig?.completesBlock === false
                ? 'reset-interval'
                : 'complete-block';
            this.addBehavior(new CountdownTimerBehavior({
                durationMs: config.durationMs,
                label: config.label,
                role: config.role,
                mode
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
     * Repeater Aspect Composer - Adds all round/iteration-related behaviors as a unit.
     * Configures round initialization, advancement, display, and optional completion.
     *
     * @param config Round configuration
     * @returns This builder for chaining
     */
    asRepeater(config: ReEntryConfig & { addCompletion?: boolean }): BlockBuilder {
        // Iteration Aspect behaviors
        this.addBehavior(new ReEntryBehavior({
            totalRounds: config.totalRounds,
            startRound: config.startRound ?? 1
        }));

        // Optional completion behavior
        if (config.addCompletion !== false) {
            this.addBehavior(new RoundsEndBehavior());
        }

        return this;
    }

    /**
     * Container Aspect Composer - Adds child selection behavior as a unit.
     * Configures child dispatch, optional looping, and optional rest injection.
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
        this.addBehavior(new ChildSelectionBehavior({
            childGroups: config.childGroups,
            loop: config.addLoop
                ? { condition: config.loopConfig?.condition ?? 'timer-active' }
                : false,
            injectRest: config.injectRest,
            skipOnMount: config.skipOnMount,
        }));

        return this;
    }

    build(): IRuntimeBlock {
        if (!this.context) throw new Error("BlockContext is required");
        if (!this.key) throw new Error("BlockKey is required");

        // Add Universal Invariants - automatically added to ALL blocks
        // These behaviors are added implicitly and don't require strategy opt-in
        this.addBehaviorIfMissing(new CompletionTimestampBehavior());

        const block = new RuntimeBlock(
            this.runtime,
            this.sourceIds,
            Array.from(this.behaviors.values()),
            this.context,
            this.key,
            this.blockType
            // label is NOT passed here — it's pushed as a Label fragment below
        );

        // Push fragment memory preserving group structure from strategies
        if (this.fragments && this.fragments.length > 0) {
            // Push each fragment group as a separate 'fragment:display' location
            for (const group of this.fragments) {
                block.pushMemory(new MemoryLocation('fragment:display', group));
            }
        }

        // Push label as a Label fragment in dedicated memory location
        if (this.label) {
            block.pushMemory(new MemoryLocation('fragment:label', [{
                fragmentType: FragmentType.Label,
                type: 'label',
                image: this.label,
                origin: 'compiler',
                value: this.label,
            } as ICodeFragment]));
        }

        return block;
    }
}
