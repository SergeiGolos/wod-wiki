import { describe, it, expect, beforeEach } from 'bun:test';
import { LocalEventProvider } from '../LocalEventProvider';
import type { IScriptRuntime } from '../../contracts/IScriptRuntime';
import type { IEvent } from '../../contracts/events/IEvent';
import type { EventCallback } from '../../contracts/events/IEventBus';

function createMockRuntime(): IScriptRuntime & { handledEvents: IEvent[] } {
    const callbacks = new Map<string, Set<EventCallback>>();
    const handledEvents: IEvent[] = [];

    return {
        handledEvents,
        options: {},
        script: { source: '', statements: [], errors: [], getIds: () => [], getId: () => undefined, getAt: () => undefined } as any,
        eventBus: {
            register: () => () => {},
            on(eventName: string, callback: EventCallback) {
                if (!callbacks.has(eventName)) callbacks.set(eventName, new Set());
                callbacks.get(eventName)!.add(callback);
                return () => callbacks.get(eventName)?.delete(callback);
            },
            unregisterById: () => {},
            unregisterByOwner: () => {},
            dispatch: () => [],
            emit(event: IEvent, runtime: IScriptRuntime) {
                callbacks.get(event.name)?.forEach((cb) => cb(event, runtime));
                callbacks.get('*')?.forEach((cb) => cb(event, runtime));
            },
            dispose: () => callbacks.clear(),
        } as any,
        stack: { blocks: [], count: 0, current: undefined, keys: [], push: () => {}, pop: () => undefined, clear: () => {}, subscribe: () => () => {} } as any,
        jit: null as any,
        clock: { now: new Date(), elapsed: 0, isRunning: false, spans: [], start: () => new Date(), stop: () => new Date() } as any,
        errors: [],
        tracker: null as any,
        subscribeToStack: () => () => {},
        subscribeToOutput: () => () => {},
        subscribeToTracker: () => () => {},
        setAnalyticsEngine: () => {},
        finalizeAnalytics: () => [],
        getOutputStatements: () => [],
        addOutput: () => {},
        do: () => {},
        doAll: () => {},
        handle(event: IEvent) {
            handledEvents.push(event);
            (this.eventBus as any).emit(event, this);
        },
        pushBlock: () => {},
        popBlock: () => {},
        dispose: () => {},
    } as any;
}

describe('LocalEventProvider', () => {
    let runtime: ReturnType<typeof createMockRuntime>;
    let provider: LocalEventProvider;

    beforeEach(() => {
        runtime = createMockRuntime();
        provider = new LocalEventProvider(runtime);
    });

    it('dispatch should forward events to runtime.handle', () => {
        const event: IEvent = { name: 'next', timestamp: new Date() };
        provider.dispatch(event);

        expect(runtime.handledEvents).toHaveLength(1);
        expect(runtime.handledEvents[0]).toEqual(event);
    });

    it('onEvent should receive events emitted through runtime', () => {
        const received: IEvent[] = [];
        provider.onEvent((event) => received.push(event));

        provider.dispatch({ name: 'start', timestamp: new Date(), data: { source: 'test' } });

        expect(received).toHaveLength(1);
        expect(received[0].name).toBe('start');
        expect(received[0].data).toEqual({ source: 'test' });
    });

    it('onEvent unsubscribe should stop receiving events', () => {
        const received: IEvent[] = [];
        const unsubscribe = provider.onEvent((event) => received.push(event));

        unsubscribe();
        provider.dispatch({ name: 'pause', timestamp: new Date() });

        expect(received).toHaveLength(0);
    });

    it('dispose should unsubscribe all listeners and block future dispatch', () => {
        const received: IEvent[] = [];
        provider.onEvent((event) => received.push(event));

        provider.dispose();
        provider.dispatch({ name: 'stop', timestamp: new Date() });

        expect(received).toHaveLength(0);
        expect(runtime.handledEvents).toHaveLength(0);
    });
});
