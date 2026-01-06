import { IRuntimeBehavior } from "../contracts/IRuntimeBehavior";
import { IBlockContext } from "../contracts/IBlockContext";
import { BlockKey } from "../../core/models/BlockKey";
import { IRuntimeBlock } from "../contracts/IRuntimeBlock";
import { RuntimeBlock } from "../RuntimeBlock";
import { IScriptRuntime } from "../contracts/IScriptRuntime";
import { ICodeFragment } from "../../core/models/CodeFragment";

export class BlockBuilder {
    private behaviors: Map<any, IRuntimeBehavior> = new Map();
    private context: IBlockContext | undefined;
    private key: BlockKey | undefined;
    private label: string = "";
    private blockType: string = "Block";
    private fragments: ICodeFragment[][] | undefined;
    private sourceIds: number[] = [];

    constructor(private runtime: IScriptRuntime) {}

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

    build(): IRuntimeBlock {
        if (!this.context) throw new Error("BlockContext is required");
        if (!this.key) throw new Error("BlockKey is required");

        return new RuntimeBlock(
            this.runtime,
            this.sourceIds,
            Array.from(this.behaviors.values()),
            this.context,
            this.key,
            this.blockType,
            this.label,
            this.fragments
        );
    }
}
