import type { ScriptState } from './ScriptState';
import type { IRuntimeBlock } from '@/runtime/contracts/IRuntimeBlock';
import type { IMetric } from '@/core/models/Metric';
import type { RpcMessage, RpcStackUpdate, RpcEvent } from '@/services/cast/rpc/RpcMessages';

/** Snapshot read API rooted at a ScriptState. */
export interface Assertions {
    /** Reference the current (top-of-stack) block, or undefined if stack is empty. */
    currentBlock(): BlockAssertions | undefined;
    /** Find a block by its label, top-to-bottom. */
    blockByLabel(label: string): BlockAssertions | undefined;
    /** Find a block by its key. */
    blockByKey(key: string): BlockAssertions | undefined;
    /** All blocks on the stack, top-to-bottom. */
    blocks(): BlockAssertions[];
    /**
     * Find blocks whose `blockType` matches the given type tag, top-to-bottom.
     * Supports the `block(type).memory(tag).value` access pattern that
     * compliance tests use.
     */
    blocksByType(type: string): BlockAssertions[];
    /** All cast-bound messages. */
    cast(): CastAssertions;
    /** Stack assertions. */
    stack(): StackAssertions;
}

export interface BlockAssertions {
    readonly block: IRuntimeBlock;
    label(): string;
    blockType(): string;
    isComplete(): boolean;
    /** Read metrics by memory tag (display, promote, result, private:*). Flattened across all locations. */
    memoryByTag(tag: string): readonly IMetric[];
    /** Return the first metric with the given type across all memory locations. */
    metric(type: string): IMetric | undefined;
    /** Did this block see a particular event by name? Reads from cast messages. */
    receivedEvent(name: string): boolean;
}

export interface CastAssertions {
    /** All sent messages. */
    messages(): readonly RpcMessage[];
    /** Sent messages filtered to a specific RpcMessage discriminator. */
    filter<T extends RpcMessage['type']>(type: T): Extract<RpcMessage, { type: T }>[];
    /** Count of RpcStackUpdate messages. */
    stackUpdateCount(): number;
    /** Most recent RpcStackUpdate, or undefined. */
    lastStackUpdate(): RpcStackUpdate | undefined;
    /** Did the cast side ever receive an RpcEvent for the given name? */
    sawEvent(name: string): boolean;
}

export interface StackAssertions {
    depth(): number;
    isEmpty(): boolean;
    /** Convenience: did a push or pop happen on this snapshot vs a baseline? */
    changed(baseline: ScriptState): boolean;
}

class BlockAssertionsImpl implements BlockAssertions {
    readonly block: IRuntimeBlock;
    private readonly state: ScriptState;

    constructor(block: IRuntimeBlock, state: ScriptState) {
        this.block = block;
        this.state = state;
    }

    label(): string {
        return this.block.label;
    }

    blockType(): string {
        return this.block.blockType ?? '';
    }

    isComplete(): boolean {
        return this.block.isComplete;
    }

    memoryByTag(tag: string): readonly IMetric[] {
        const locations = this.block.getAllMemory().filter(loc => loc.tag === tag);
        return locations.flatMap(loc => loc.metrics.toArray());
    }

    metric(type: string): IMetric | undefined {
        return this.block
            .getAllMemory()
            .flatMap(loc => loc.metrics.toArray())
            .find(m => m.type === type);
    }

    receivedEvent(name: string): boolean {
        return this.state.castSent.some(
            (m): m is RpcEvent => m.type === 'rpc-event' && m.name === name,
        );
    }
}

class CastAssertionsImpl implements CastAssertions {
    private readonly state: ScriptState;

    constructor(state: ScriptState) {
        this.state = state;
    }

    messages(): readonly RpcMessage[] {
        return this.state.castSent;
    }

    filter<T extends RpcMessage['type']>(type: T): Extract<RpcMessage, { type: T }>[] {
        return this.state.castSent.filter(
            (m): m is Extract<RpcMessage, { type: T }> => m.type === type,
        );
    }

    stackUpdateCount(): number {
        return this.filter('rpc-stack-update').length;
    }

    lastStackUpdate(): RpcStackUpdate | undefined {
        const updates = this.filter('rpc-stack-update');
        return updates[updates.length - 1];
    }

    sawEvent(name: string): boolean {
        return this.state.castSent.some(
            (m): m is RpcEvent => m.type === 'rpc-event' && m.name === name,
        );
    }
}

class StackAssertionsImpl implements StackAssertions {
    private readonly state: ScriptState;

    constructor(state: ScriptState) {
        this.state = state;
    }

    depth(): number {
        return this.state.depth;
    }

    isEmpty(): boolean {
        return this.state.depth === 0;
    }

    changed(baseline: ScriptState): boolean {
        if (this.state.depth !== baseline.depth) {
            return true;
        }
        const currentKey = this.state.current?.key.toString();
        const baselineKey = baseline.current?.key.toString();
        return currentKey !== baselineKey;
    }
}

class AssertionsImpl implements Assertions {
    private readonly state: ScriptState;

    constructor(state: ScriptState) {
        this.state = state;
    }

    currentBlock(): BlockAssertions | undefined {
        return this.state.current
            ? new BlockAssertionsImpl(this.state.current, this.state)
            : undefined;
    }

    blockByLabel(label: string): BlockAssertions | undefined {
        const block = this.state.blocks.find(b => b.label === label);
        return block ? new BlockAssertionsImpl(block, this.state) : undefined;
    }

    blockByKey(key: string): BlockAssertions | undefined {
        const block = this.state.blocks.find(b => b.key.toString() === key);
        return block ? new BlockAssertionsImpl(block, this.state) : undefined;
    }

    blocks(): BlockAssertions[] {
        return this.state.blocks.map(b => new BlockAssertionsImpl(b, this.state));
    }

    blocksByType(type: string): BlockAssertions[] {
        return this.state.blocks
            .filter(b => b.blockType === type)
            .map(b => new BlockAssertionsImpl(b, this.state));
    }

    cast(): CastAssertions {
        return new CastAssertionsImpl(this.state);
    }

    stack(): StackAssertions {
        return new StackAssertionsImpl(this.state);
    }
}
/** Build the assertion tree from a snapshot. Pure read; no mutation. */
export function assertions(state: ScriptState): Assertions {
    return new AssertionsImpl(state);
}

/** Run a set of assertions, throwing an AggregateError on any mismatch. */
export function expectAll(state: ScriptState, checks: Array<(a: Assertions) => void>): void {
    const errors: Error[] = [];
    const a = assertions(state);
    for (const check of checks) {
        try {
            check(a);
        } catch (e) {
            errors.push(e instanceof Error ? e : new Error(String(e)));
        }
    }
    if (errors.length > 0) {
        throw new AggregateError(errors, `${errors.length} assertion(s) failed`);
    }
}
