/**
 * Integration Test Helpers
 * 
 * Provides utilities for testing multi-behavior compositions
 * in realistic runtime scenarios.
 */

import { vi, expect } from 'bun:test';
import { IRuntimeBehavior } from '../../../contracts/IRuntimeBehavior';
import { IBehaviorContext } from '../../../contracts/IBehaviorContext';
import { IRuntimeBlock } from '../../../contracts/IRuntimeBlock';
import { MemoryType, MemoryTypeMap, TimerState, RoundState, DisplayState } from '../../../memory/MemoryTypes';
import { TimeSpan } from '../../../models/TimeSpan';
import { IMemoryLocation, MemoryTag, MemoryLocation } from '../../../memory/MemoryLocation';
import { ICodeFragment, FragmentType } from '../../../../core/models/CodeFragment';

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
    /** List-based memory locations (new API) */
    _memoryLocations: IMemoryLocation[];
    /** New list-based API: get locations by tag */
    getMemoryByTag(tag: MemoryTag): IMemoryLocation[];
    /** New list-based API: push a location */
    pushMemory(location: IMemoryLocation): void;
    /** New list-based API: get all locations */
    getAllMemory(): IMemoryLocation[];
    /** Stub for getBehavior */
    getBehavior(type: any): any;
}

/**
 * Creates a mock block.
 */
export function createMockBlock(config: Partial<MockBlock> = {}): MockBlock {
    const memoryLocations: IMemoryLocation[] = [];

    const block: MockBlock = {
        key: { toString: () => config.key?.toString() ?? 'test-block' },
        blockType: config.blockType ?? 'Test',
        get label(): string {
            for (const loc of memoryLocations) {
                for (const frag of loc.fragments) {
                    if (frag.fragmentType === FragmentType.Label) {
                        return frag.image || (frag.value as any)?.toString() || block.blockType || 'Block';
                    }
                }
            }
            return block.blockType || 'Block';
        },
        fragments: config.fragments ?? [],
        memory: config.memory ?? new Map(),
        _memoryLocations: memoryLocations,
        getMemoryByTag(tag: MemoryTag): IMemoryLocation[] {
            return memoryLocations.filter(loc => loc.tag === tag);
        },
        pushMemory(location: IMemoryLocation): void {
            memoryLocations.push(location);
        },
        getAllMemory(): IMemoryLocation[] {
            return [...memoryLocations];
        },
        getBehavior(_type: any): any {
            return undefined;
        }
    };

    // Store label as a Label fragment in memory list
    const labelText = config.label ?? config.blockType ?? 'Test Block';
    if (labelText) {
        memoryLocations.push(new MemoryLocation('fragment:label', [{
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
 * 
 * Bridges list-based memory (new API) with the Map-based `block.memory` (old API)
 * so that both behaviors and test assertions work correctly.
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
            // Try list-based memory first
            const locations = block.getMemoryByTag(type as unknown as MemoryTag);
            if (locations.length > 0 && locations[0].fragments.length > 0) {
                return locations[0].fragments[0].value as MemoryTypeMap[T];
            }
            // Fall back to Map
            return block.memory.get(type) as MemoryTypeMap[T] | undefined;
        },

        setMemory<T extends MemoryType>(type: T, value: MemoryTypeMap[T]) {
            // Write to Map for backward compat assertions
            block.memory.set(type, value);
            // Also write to list-based memory
            const tag = type as unknown as MemoryTag;
            const locations = block.getMemoryByTag(tag);
            if (locations.length > 0) {
                const fragment: ICodeFragment = {
                    fragmentType: 0 as any,
                    type: tag,
                    image: '',
                    origin: 'runtime',
                    value,
                    sourceBlockKey: block.key.toString(),
                    timestamp: new Date(),
                } as any;
                locations[0].update([fragment]);
            } else {
                const fragment: ICodeFragment = {
                    fragmentType: 0 as any,
                    type: tag,
                    image: '',
                    origin: 'runtime',
                    value,
                    sourceBlockKey: block.key.toString(),
                    timestamp: new Date(),
                } as any;
                block.pushMemory(new MemoryLocation(tag, [fragment]));
            }
        },

        pushMemory(tag: string, fragments: ICodeFragment[]) {
            const memTag = tag as MemoryTag;
            const location = new MemoryLocation(memTag, fragments);
            block.pushMemory(location);
            // Sync to Map for backward compat assertions
            if (fragments.length > 0 && fragments[0].value !== undefined) {
                block.memory.set(tag as MemoryType, fragments[0].value);
            }
        },

        updateMemory(tag: string, fragments: ICodeFragment[]) {
            const memTag = tag as MemoryTag;
            const locations = block.getMemoryByTag(memTag);
            if (locations.length > 0) {
                locations[0].update(fragments);
            } else {
                // Create new location if none exists
                const location = new MemoryLocation(memTag, fragments);
                block.pushMemory(location);
            }
            // Sync to Map for backward compat assertions
            if (fragments.length > 0 && fragments[0].value !== undefined) {
                block.memory.set(tag as MemoryType, fragments[0].value);
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

/**
 * Gets the display fragments from a block's memory locations.
 * Returns all fragments from the first 'display' memory location.
 */
export function getDisplayFragments(block: MockBlock): Array<{ text: string; role: string }> {
    const locations = block.getMemoryByTag('display' as MemoryTag);
    if (locations.length === 0) return [];
    return locations[0].fragments.map(f => f.value as { text: string; role: string });
}

/**
 * Gets the display label from a block's display memory.
 */
export function getDisplayLabel(block: MockBlock): string | undefined {
    const frags = getDisplayFragments(block);
    const label = frags.find(f => f.role === 'label');
    return label?.text;
}

/**
 * Gets the round display text from a block's display memory.
 */
export function getRoundDisplay(block: MockBlock): string | undefined {
    const frags = getDisplayFragments(block);
    const round = frags.find(f => f.role === 'round');
    return round?.text;
}

/**
 * Asserts that display memory contains a label with the expected text.
 */
export function expectDisplayLabel(block: MockBlock, expectedLabel: string): void {
    const label = getDisplayLabel(block);
    expect(label).toBeDefined();
    expect(label).toBe(expectedLabel);
}

/**
 * Asserts that display memory contains a round display with the expected text.
 */
export function expectRoundDisplay(block: MockBlock, expected: string): void {
    const roundDisplay = getRoundDisplay(block);
    expect(roundDisplay).toBeDefined();
    expect(roundDisplay).toBe(expected);
}
