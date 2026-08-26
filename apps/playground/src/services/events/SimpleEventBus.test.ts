import { describe, expect, it } from 'bun:test';

import { SimpleEventBus } from './SimpleEventBus';
import type { IServiceEventBus } from './IServiceEventBus';

interface TestEvent {
    kind: string;
    payload: number;
}

describe('SimpleEventBus (IServiceEventBus adapter)', () => {
    let bus: IServiceEventBus<TestEvent>;

    it('delivers emitted events to a single subscriber in registration order', () => {
        bus = new SimpleEventBus<TestEvent>();
        const seen: TestEvent[] = [];
        bus.subscribe((e) => seen.push(e));
        bus.emit({ kind: 'a', payload: 1 });
        bus.emit({ kind: 'b', payload: 2 });
        expect(seen).toEqual([
            { kind: 'a', payload: 1 },
            { kind: 'b', payload: 2 },
        ]);
    });

    it('delivers to multiple subscribers in registration order', () => {
        bus = new SimpleEventBus<TestEvent>();
        const a: TestEvent[] = [];
        const b: TestEvent[] = [];
        bus.subscribe((e) => a.push(e));
        bus.subscribe((e) => b.push(e));
        bus.emit({ kind: 'x', payload: 0 });
        expect(a).toEqual([{ kind: 'x', payload: 0 }]);
        expect(b).toEqual([{ kind: 'x', payload: 0 }]);
    });

    it('the unsubscribe function stops further deliveries to that listener only', () => {
        bus = new SimpleEventBus<TestEvent>();
        const a: TestEvent[] = [];
        const b: TestEvent[] = [];
        const unsubA = bus.subscribe((e) => a.push(e));
        bus.subscribe((e) => b.push(e));
        bus.emit({ kind: 'one', payload: 1 });
        unsubA();
        bus.emit({ kind: 'two', payload: 2 });
        expect(a).toEqual([{ kind: 'one', payload: 1 }]);
        expect(b).toEqual([
            { kind: 'one', payload: 1 },
            { kind: 'two', payload: 2 },
        ]);
    });

    it('emitting to a bus with no subscribers is a no-op (no throw)', () => {
        bus = new SimpleEventBus<TestEvent>();
        expect(() => bus.emit({ kind: 'lonely', payload: 9 })).not.toThrow();
    });

    it('size reflects the number of active subscribers', () => {
        bus = new SimpleEventBus<TestEvent>();
        expect(bus.size).toBe(0);
        const u1 = bus.subscribe(() => undefined);
        expect(bus.size).toBe(1);
        bus.subscribe(() => undefined);
        expect(bus.size).toBe(2);
        u1();
        expect(bus.size).toBe(1);
    });

    it('an error in one subscriber does not stop later subscribers from receiving the event', () => {
        bus = new SimpleEventBus<TestEvent>();
        const seen: TestEvent[] = [];
        // Suppress the expected console.error so the test output is clean.
        const original = console.error;
        console.error = () => undefined;
        try {
            bus.subscribe(() => {
                throw new Error('boom');
            });
            bus.subscribe((e) => seen.push(e));
            bus.emit({ kind: 'survives', payload: 1 });
        } finally {
            console.error = original;
        }
        expect(seen).toEqual([{ kind: 'survives', payload: 1 }]);
    });

    it('a subscriber added after emit is not retroactively called', () => {
        bus = new SimpleEventBus<TestEvent>();
        const seen: TestEvent[] = [];
        bus.emit({ kind: 'before', payload: 0 });
        bus.subscribe((e) => seen.push(e));
        bus.emit({ kind: 'after', payload: 1 });
        expect(seen).toEqual([{ kind: 'after', payload: 1 }]);
    });

    it('two bus instances do not share state', () => {
        const a = new SimpleEventBus<TestEvent>();
        const b = new SimpleEventBus<TestEvent>();
        const seen: TestEvent[] = [];
        a.subscribe((e) => seen.push(e));
        b.emit({ kind: 'a-doesnt-see', payload: 0 });
        expect(seen).toEqual([]);
    });
});
