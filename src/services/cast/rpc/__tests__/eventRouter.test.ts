import { describe, it, expect } from 'bun:test';
import { routeRuntimeEventByName, routeRuntimeEvent } from '../eventRouter';
import type { IEvent } from '@/runtime/contracts/events';

const makeHandles = () => {
    const calls: string[] = [];
    return {
        calls,
        handles: {
            onNext: () => { calls.push('next'); },
            onStart: () => { calls.push('start'); },
            onPause: () => { calls.push('pause'); },
            onStop: () => { calls.push('stop'); },
        },
    };
};

const event = (name: string): IEvent => ({ name, timestamp: new Date() });

describe('routeRuntimeEventByName', () => {
    it('routes "next" to handles.onNext', () => {
        const { calls, handles } = makeHandles();
        routeRuntimeEventByName('next', handles);
        expect(calls).toEqual(['next']);
    });

    it('routes "start" to handles.onStart', () => {
        const { calls, handles } = makeHandles();
        routeRuntimeEventByName('start', handles);
        expect(calls).toEqual(['start']);
    });

    it('routes "pause" to handles.onPause', () => {
        const { calls, handles } = makeHandles();
        routeRuntimeEventByName('pause', handles);
        expect(calls).toEqual(['pause']);
    });

    it('routes "stop" to handles.onStop', () => {
        const { calls, handles } = makeHandles();
        routeRuntimeEventByName('stop', handles);
        expect(calls).toEqual(['stop']);
    });

    it('ignores unknown event names without throwing', () => {
        const { calls, handles } = makeHandles();
        expect(() => routeRuntimeEventByName('select-block', handles)).not.toThrow();
        expect(calls).toEqual([]);
    });

    it('ignores the runtime internal "tick" event', () => {
        const { calls, handles } = makeHandles();
        routeRuntimeEventByName('tick', handles);
        expect(calls).toEqual([]);
    });
});

describe('routeRuntimeEvent (IEvent convenience)', () => {
    it('pulls the name off an IEvent and routes it', () => {
        const { calls, handles } = makeHandles();
        routeRuntimeEvent(event('next'), handles);
        expect(calls).toEqual(['next']);
    });

    it('ignores unknown event names from an IEvent', () => {
        const { calls, handles } = makeHandles();
        routeRuntimeEvent(event('arbitrary'), handles);
        expect(calls).toEqual([]);
    });
});
