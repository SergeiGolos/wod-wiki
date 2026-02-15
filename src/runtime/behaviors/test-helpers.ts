/**
 * Integration Test Helpers
 * 
 * Provides utilities for testing multi-behavior compositions
 * in realistic runtime scenarios.
 */

import { TimeSpan } from '@/core';
import { vi, expect } from 'bun:test';
import { IRuntimeBlock, IRuntimeBehavior } from '../contracts';
import { IBehaviorContext } from '../contracts/IBehaviorContext';
import { MemoryTypeMap, TimerState, MemoryType, RoundState } from '../memory/MemoryTypes';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { IMemoryLocation, MemoryLocation, MemoryTag } from '../memory/MemoryLocation';
import { FragmentVisibility, getFragmentVisibility } from '../memory/FragmentVisibility';


/**
 * Mock clock for deterministic time control in tests.
 */
export class MockClock {
    private _now: number;

    constructor(startTime: number = 0) {
        this._now = startTime;
    }

    get now(): Date {
        return new Date(this._now);
    }

    get timestamp(): number {
        return this._now;
    }

    advance(ms: number): void {
        this._now += ms;
    }

    set(time: number): void {
        this._now = time;
    }
}

/**
 * Mock runtime for integration testing.
 */
export interface MockRuntime {
    clock: MockClock;
    events: Array<{ name: string; data: unknown; timestamp: number }>;
    outputs: Array<{ type: string; fragments: unknown[]; metadata: unknown }>;
    completionReason: string | undefined;
    subscriptions: Map<string, Array<(event: unknown, ctx: IBehaviorContext) => unknown[]>>;
}

/**
 * Creates a mock runtime for testing.
 */
export function createMockRuntime(startTime: number = 0): MockRuntime {
    return {
        clock: new MockClock(startTime),
        events: [],
        outputs: [],
        completionReason: undefined,
        subscriptions: new Map()
    };
}

/**
 * Mock block for integration testing.
 */
export interface MockBlock {
    key: { toString: () => string };
    blockType: string;
    /** Computed label derived from fragment:label memory. */
    readonly label: string;
    fragments: unknown[][];
    memory: Map<MemoryType, unknown>;
    /** List-based memory storage for new API */
    _memoryList: IMemoryLocation[];
    /** Push a memory location (list-based API) */
    pushMemory(location: IMemoryLocation): void;
    /** Get memory locations by tag (list-based API) */
    getMemoryByTag(tag: MemoryTag): IMemoryLocation[];
    /** Get all memory locations */
    getAllMemory(): IMemoryLocation[];
    /** Get fragment memory by visibility tier */
    getFragmentMemoryByVisibility(visibility: FragmentVisibility): IMemoryLocation[];
    /** Backward-compat shim */
    getMemory<T extends MemoryType>(type: T): any;
    /** Backward-compat shim */
    hasMemory(type: MemoryType): boolean;
    /** Backward-compat shim */
    setMemoryValue<T extends MemoryType>(type: T, value: any): void;
}

/**
 * Creates a mock block.
 */
export function createMockBlock(config: Partial<MockBlock> = {}): MockBlock {
    const memoryList: IMemoryLocation[] = [];
    const memoryMap = config.memory ?? new Map();
    const block: MockBlock = {
        key: { toString: () => config.key?.toString() ?? 'test-block' },
        blockType: config.blockType ?? 'Test',
        get label(): string {
            for (const loc of memoryList) {
                for (const frag of loc.fragments) {
                    if (frag.fragmentType === FragmentType.Label) {
                        return frag.image || (frag.value as any)?.toString() || block.blockType || 'Block';
                    }
                }
            }
            return block.blockType || 'Block';
        },
        fragments: config.fragments ?? [],
        memory: memoryMap,
        _memoryList: memoryList,
        pushMemory(location: IMemoryLocation): void {
            memoryList.push(location);
        },
        getMemoryByTag(tag: MemoryTag): IMemoryLocation[] {
            return memoryList.filter(loc => loc.tag === tag);
        },
        getAllMemory(): IMemoryLocation[] {
            return [...memoryList];
        },
        getFragmentMemoryByVisibility(visibility: FragmentVisibility): IMemoryLocation[] {
            return memoryList.filter(loc => getFragmentVisibility(loc.tag) === visibility);
        },
        getMemory<T extends MemoryType>(type: T): any {
            const tag = type as string as MemoryTag;
            const locations = memoryList.filter(loc => loc.tag === tag);
            if (locations.length > 0) {
                const loc = locations[0];
                return {
                    get value() {
                        if (loc.fragments.length === 0) return undefined;
                        return loc.fragments[0]?.value;
                    },
                    subscribe(listener: (nv: any, ov: any) => void): () => void {
                        return loc.subscribe((nf, of_) => {
                            listener(nf[0]?.value, of_[0]?.value);
                        });
                    }
                };
            }
            // Fall back to legacy map
            const val = memoryMap.get(type);
            if (val !== undefined) {
                return { value: val, subscribe: () => () => {} };
            }
            return undefined;
        },
        hasMemory(type: MemoryType): boolean {
            const tag = type as string as MemoryTag;
            return memoryList.some(loc => loc.tag === tag) || memoryMap.has(type);
        },
        setMemoryValue<T extends MemoryType>(type: T, value: any): void {
            const tag = type as string as MemoryTag;
            const locations = memoryList.filter(loc => loc.tag === tag);
            if (locations.length > 0) {
                const loc = locations[0];
                if (loc.fragments.length > 0) {
                    loc.update(loc.fragments.map((f, i) => i === 0 ? { ...f, value } : f));
                } else {
                    loc.update([{ fragmentType: 0, type: tag, image: '', origin: 'runtime', value } as any]);
                }
            } else {
                memoryMap.set(type, value);
            }
        },
    };

    // Store label as a Label fragment in memory list
    const labelText = config.label ?? config.blockType ?? 'Test Block';
    if (labelText) {
        memoryList.push(new MemoryLocation('fragment:label', [{
            fragmentType: FragmentType.Label,
            type: 'label',
            image: labelText,
            origin: 'config',
            value: labelText
        } as ICodeFragment]));
    }

    return block;
}

/**
 * Creates a behavior context for integration testing.
 */
export function createIntegrationContext(
    runtime: MockRuntime,
    block: MockBlock
): IBehaviorContext {
    return {
        block: block as unknown as IRuntimeBlock,
        clock: runtime.clock,
        stackLevel: 0,

        subscribe(eventType: string, handler: (event: unknown, ctx: IBehaviorContext) => unknown[]) {
            if (!runtime.subscriptions.has(eventType)) {
                runtime.subscriptions.set(eventType, []);
            }
            runtime.subscriptions.get(eventType)!.push(handler);
        },

        emitEvent(event: { name: string; timestamp: Date; data: unknown }) {
            runtime.events.push({
                name: event.name,
                data: event.data,
                timestamp: event.timestamp.getTime()
            });
        },

        emitOutput(type: string, fragments: unknown[], metadata: unknown) {
            runtime.outputs.push({ type, fragments, metadata });
        },

        markComplete(reason: string) {
            runtime.completionReason = reason;
        },

        getMemory<T extends MemoryType>(type: T): MemoryTypeMap[T] | undefined {
            // Check list-based memory first
            const tag = type as string as MemoryTag;
            const locations = block._memoryList.filter(loc => loc.tag === tag);
            if (locations.length > 0 && locations[0].fragments.length > 0) {
                return locations[0].fragments[0]?.value as MemoryTypeMap[T];
            }
            return block.memory.get(type) as MemoryTypeMap[T] | undefined;
        },

        setMemory<T extends MemoryType>(type: T, value: MemoryTypeMap[T]) {
            // Try list-based first
            const tag = type as string as MemoryTag;
            const locations = block._memoryList.filter(loc => loc.tag === tag);
            if (locations.length > 0) {
                const loc = locations[0];
                if (loc.fragments.length > 0) {
                    loc.update(loc.fragments.map((f, i) => i === 0 ? { ...f, value } : f));
                } else {
                    loc.update([{ fragmentType: 0, type: tag, image: '', origin: 'runtime', value } as any]);
                }
            } else {
                block.memory.set(type, value);
            }
        },

        pushMemory(tag: string, fragments: ICodeFragment[]): IMemoryLocation {
            const location = new MemoryLocation(tag as MemoryTag, fragments);
            block.pushMemory(location);
            return location;
        },

        updateMemory(tag: string, fragments: ICodeFragment[]): void {
            const locations = block.getMemoryByTag(tag as MemoryTag);
            if (locations.length > 0) {
                locations[0].update(fragments);
            }
        }
    } as IBehaviorContext;
}

/**
 * Simulates tick events for timer testing.
 */
export function simulateTicks(
    runtime: MockRuntime,
    ctx: IBehaviorContext,
    count: number,
    intervalMs: number = 1000
): void {
    for (let i = 0; i < count; i++) {
        runtime.clock.advance(intervalMs);
        dispatchEvent(runtime, ctx, 'tick', { timestamp: runtime.clock.timestamp });
    }
}

/**
 * Dispatches an event to all subscribed handlers.
 */
export function dispatchEvent(
    runtime: MockRuntime,
    ctx: IBehaviorContext,
    eventType: string,
    eventData: unknown = {}
): void {
    const handlers = runtime.subscriptions.get(eventType) || [];
    // Create proper event object with name field as behaviors expect
    const event = {
        name: eventType,
        timestamp: runtime.clock.now,
        data: eventData
    };
    for (const handler of handlers) {
        handler(event, ctx);
    }
}

/**
 * Mounts all behaviors and returns the context.
 */
export function mountBehaviors(
    behaviors: IRuntimeBehavior[],
    runtime: MockRuntime,
    block: MockBlock
): IBehaviorContext {
    const ctx = createIntegrationContext(runtime, block);
    for (const behavior of behaviors) {
        behavior.onMount(ctx);
    }
    return ctx;
}

/**
 * Calls onNext on all behaviors.
 */
export function advanceBehaviors(
    behaviors: IRuntimeBehavior[],
    ctx: IBehaviorContext
): void {
    for (const behavior of behaviors) {
        behavior.onNext(ctx);
    }
}

/**
 * Unmounts all behaviors.
 */
export function unmountBehaviors(
    behaviors: IRuntimeBehavior[],
    ctx: IBehaviorContext
): void {
    for (const behavior of behaviors) {
        behavior.onUnmount(ctx);
    }
}

/**
 * Asserts memory state matches expected values.
 */
export function expectMemoryState<T extends MemoryType>(
    block: MockBlock,
    type: T,
    expected: Partial<MemoryTypeMap[T]>
): void {
    const actual = block.memory.get(type) as MemoryTypeMap[T] | undefined;
    expect(actual).toBeDefined();
    expect(actual).toMatchObject(expected);
}

/**
 * Calculates elapsed time from timer state.
 */
export function calculateElapsed(timer: TimerState, now: number): number {
    let total = 0;
    for (const span of timer.spans) {
        const end = span.ended ?? now;
        total += end - span.started;
    }
    return total;
}

/**
 * Creates initial timer state for testing.
 */
export function createTimerState(config: {
    direction?: 'up' | 'down';
    durationMs?: number;
    startTime?: number;
    label?: string;
}): TimerState {
    return {
        direction: config.direction ?? 'up',
        durationMs: config.durationMs,
        spans: [new TimeSpan(config.startTime ?? 0)],
        label: config.label ?? 'Test Timer',
        role: 'primary'
    };
}

/**
 * Creates initial round state for testing.
 */
export function createRoundState(config: {
    current?: number;
    total?: number;
}): RoundState {
    return {
        current: config.current ?? 1,
        total: config.total
    };
}

/**
 * Finds events by name.
 */
export function findEvents(runtime: MockRuntime, name: string): Array<{ name: string; data: unknown; timestamp: number }> {
    return runtime.events.filter(e => e.name === name);
}

/**
 * Finds outputs by type.
 */
export function findOutputs(runtime: MockRuntime, type: string): Array<{ type: string; fragments: unknown[]; metadata: unknown }> {
    return runtime.outputs.filter(o => o.type === type);
}
