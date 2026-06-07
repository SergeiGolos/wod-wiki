import { describe, it, expect } from 'bun:test';
import { assertions, expectAll } from './assertions';
import type { ScriptState } from './ScriptState';
import { MockBlock } from '@/testing/harness/MockBlock';
import { MemoryLocation } from '@/runtime/memory/MemoryLocation';
import { MetricType } from '@/core/models/Metric';
import type { RpcStackUpdate, RpcEvent } from '@/services/cast/rpc/RpcMessages';

function makeState(partial: Partial<ScriptState> = {}): ScriptState {
    return {
        blocks: [],
        depth: 0,
        current: undefined,
        clockTime: new Date(),
        castSent: [],
        stackHistory: [],
        ...partial,
    } as ScriptState;
}

describe('assertions DSL', () => {
    it('currentBlock returns the top block descriptor', () => {
        const block = new MockBlock({ id: 'b1', label: 'Run' });
        const state = makeState({
            blocks: [block],
            depth: 1,
            current: block,
        });
        expect(assertions(state).currentBlock()?.label()).toBe('Run');
    });

    it('blocks returns one descriptor per block', () => {
        const b1 = new MockBlock({ id: 'b1', label: 'Run' });
        const b2 = new MockBlock({ id: 'b2', label: 'Rest' });
        const state = makeState({
            blocks: [b1, b2],
            depth: 2,
            current: b2,
        });
        const descs = assertions(state).blocks();
        expect(descs.length).toBe(2);
        expect(descs[0].label()).toBe('Run');
        expect(descs[1].label()).toBe('Rest');
    });

    it('cast filter returns typed list', () => {
        const update: RpcStackUpdate = {
            type: 'rpc-stack-update',
            snapshotType: 'push',
            blocks: [],
            depth: 1,
            clockTime: Date.now(),
        };
        const state = makeState({
            castSent: [update],
            depth: 1,
        });
        const filtered = assertions(state).cast().filter('rpc-stack-update');
        expect(filtered.length).toBe(1);
        expect(filtered[0].depth).toBe(1);
    });

    it('cast stackUpdateCount counts only stack updates', () => {
        const update: RpcStackUpdate = {
            type: 'rpc-stack-update',
            snapshotType: 'push',
            blocks: [],
            depth: 1,
            clockTime: Date.now(),
        };
        const event: RpcEvent = {
            type: 'rpc-event',
            name: 'tick',
            timestamp: Date.now(),
        };
        const state = makeState({
            castSent: [update, event],
        });
        expect(assertions(state).cast().stackUpdateCount()).toBe(1);
    });

    it('stack isEmpty returns true for depth 0', () => {
        const state = makeState({ depth: 0 });
        expect(assertions(state).stack().isEmpty()).toBe(true);
    });

    it('stack changed returns true when depth differs', () => {
        const before = makeState({ depth: 1 });
        const after = makeState({ depth: 2 });
        expect(assertions(after).stack().changed(before)).toBe(true);
    });

    it('expectAll throws AggregateError when a check fails', () => {
        const block = new MockBlock({ id: 'b1', label: 'Run' });
        const state = makeState({ depth: 1, current: block, blocks: [block] });
        expect(() => {
            expectAll(state, [
                a => {
                    if (a.stack().isEmpty()) throw new Error('is empty');
                },
                a => {
                    if (a.currentBlock()) throw new Error('has block');
                },
            ]);
        }).toThrow(AggregateError);
    });

    it('expectAll is silent when all checks pass', () => {
        const state = makeState({ depth: 0 });
        expect(() => {
            expectAll(state, [
                a => {
                    if (!a.stack().isEmpty()) throw new Error('not empty');
                },
            ]);
        }).not.toThrow();
    });

    it('blockByLabel finds block by label', () => {
        const b1 = new MockBlock({ id: 'b1', label: 'Run' });
        const state = makeState({
            blocks: [b1],
            depth: 1,
            current: b1,
        });
        expect(assertions(state).blockByLabel('Run')?.label()).toBe('Run');
        expect(assertions(state).blockByLabel('Missing')).toBeUndefined();
    });

    it('blockByKey finds block by key', () => {
        const b1 = new MockBlock({ id: 'b1', label: 'Run' });
        const state = makeState({
            blocks: [b1],
            depth: 1,
            current: b1,
        });
        expect(assertions(state).blockByKey('b1')?.label()).toBe('Run');
        expect(assertions(state).blockByKey('missing')).toBeUndefined();
    });

    it('memoryByTag returns flattened metrics', () => {
        const block = new MockBlock({ id: 'b1', label: 'Run' });
        block.pushMemory(
            new MemoryLocation('metric:display', [
                { type: MetricType.Time, origin: 'runtime', value: 300 },
            ]),
        );
        const state = makeState({
            blocks: [block],
            depth: 1,
            current: block,
        });
        const metrics = assertions(state).currentBlock()!.memoryByTag('metric:display');
        expect(metrics.length).toBe(1);
        expect(metrics[0].type).toBe(MetricType.Time);
        expect(metrics[0].value).toBe(300);
    });

    it('metric finds first matching metric by type', () => {
        const block = new MockBlock({ id: 'b1', label: 'Run' });
        block.pushMemory(
            new MemoryLocation('metric:display', [
                { type: MetricType.Time, origin: 'runtime', value: 300 },
                { type: MetricType.Rep, origin: 'parser', value: 10 },
            ]),
        );
        const state = makeState({
            blocks: [block],
            depth: 1,
            current: block,
        });
        const m = assertions(state).currentBlock()!.metric(MetricType.Rep);
        expect(m).toBeDefined();
        expect(m!.value).toBe(10);
        expect(assertions(state).currentBlock()!.metric('missing')).toBeUndefined();
    });

    it('receivedEvent checks cast messages for RpcEvent by name', () => {
        const block = new MockBlock({ id: 'b1', label: 'Run' });
        const event: RpcEvent = {
            type: 'rpc-event',
            name: 'finish',
            timestamp: Date.now(),
        };
        const state = makeState({
            blocks: [block],
            depth: 1,
            current: block,
            castSent: [event],
        });
        expect(assertions(state).currentBlock()!.receivedEvent('finish')).toBe(true);
        expect(assertions(state).currentBlock()!.receivedEvent('start')).toBe(false);
    });

    it('cast sawEvent checks for RpcEvent by name', () => {
        const event: RpcEvent = {
            type: 'rpc-event',
            name: 'beep',
            timestamp: Date.now(),
        };
        const state = makeState({
            castSent: [event],
        });
        expect(assertions(state).cast().sawEvent('beep')).toBe(true);
        expect(assertions(state).cast().sawEvent('boop')).toBe(false);
    });

    it('lastStackUpdate returns most recent stack update', () => {
        const u1: RpcStackUpdate = {
            type: 'rpc-stack-update',
            snapshotType: 'push',
            blocks: [],
            depth: 1,
            clockTime: Date.now(),
        };
        const u2: RpcStackUpdate = {
            type: 'rpc-stack-update',
            snapshotType: 'pop',
            blocks: [],
            depth: 0,
            clockTime: Date.now(),
        };
        const state = makeState({
            castSent: [u1, u2],
        });
        const last = assertions(state).cast().lastStackUpdate();
        expect(last).toBeDefined();
        expect(last!.snapshotType).toBe('pop');
    });

    it('stack changed returns false when nothing changed', () => {
        const block = new MockBlock({ id: 'b1', label: 'Run' });
        const baseline = makeState({
            blocks: [block],
            depth: 1,
            current: block,
        });
        const same = makeState({
            blocks: [block],
            depth: 1,
            current: block,
        });
        expect(assertions(same).stack().changed(baseline)).toBe(false);
    });

    it('stack changed returns true when current block key differs', () => {
        const b1 = new MockBlock({ id: 'b1', label: 'Run' });
        const b2 = new MockBlock({ id: 'b2', label: 'Rest' });
        const baseline = makeState({
            blocks: [b1],
            depth: 1,
            current: b1,
        });
        const changed = makeState({
            blocks: [b2],
            depth: 1,
            current: b2,
        });
        expect(assertions(changed).stack().changed(baseline)).toBe(true);
    });
});
