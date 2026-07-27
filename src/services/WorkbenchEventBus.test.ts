import { describe, expect, it, beforeEach } from 'bun:test';

import { WorkbenchEventBus } from './WorkbenchEventBus';

/**
 * WorkbenchEventBus is a typed helper bag around a SimpleEventBus. The
 * tests cover the public emit/on helpers — not the underlying bus, which
 * is covered by SimpleEventBus.test.ts. The seam between the two is that
 * .bus is exposed for untyped subscribers.
 */
describe('WorkbenchEventBus typed helpers', () => {
    let bus: WorkbenchEventBus;

    beforeEach(() => {
        bus = new WorkbenchEventBus();
    });

    it('emits SCROLL_TO_BLOCK and delivers to onScrollToBlock subscribers', () => {
        const seen: Array<{ blockId: string; source?: string }> = [];
        bus.onScrollToBlock((p) => seen.push(p));
        bus.emitScrollToBlock('b1', 'preview');
        expect(seen).toEqual([{ blockId: 'b1', source: 'preview' }]);
    });

    it('onHighlightBlock fires only for HIGHLIGHT_BLOCK events', () => {
        const seen: Array<{ blockId: string; source?: string }> = [];
        bus.onHighlightBlock((p) => seen.push(p));
        bus.emitScrollToBlock('b1', 'preview'); // wrong type
        bus.emitHighlightBlock('b2', 'editor');
        expect(seen).toEqual([{ blockId: 'b2', source: 'editor' }]);
    });

    it('emitNavigateTo and onNavigateTo round-trip an entry + view', () => {
        const seen: Array<{ entryId: string; view?: string }> = [];
        bus.onNavigateTo((p) => seen.push(p));
        bus.emitNavigateTo('entry-42', 'workbench');
        expect(seen).toEqual([{ entryId: 'entry-42', view: 'workbench' }]);
    });

    it('emitStartWorkout delivers the embedded ScriptBlock', () => {
        const seen: Array<{ block: { id: string } }> = [];
        bus.onStartWorkout((p) => seen.push(p));
        const block = { id: 'block-1' } as never;
        bus.emitStartWorkout(block);
        expect(seen).toEqual([{ block }]);
    });

    it('the unsubscribe function stops further deliveries', () => {
        const seen: string[] = [];
        const unsub = bus.onScrollToBlock((p) => seen.push(p.blockId));
        bus.emitScrollToBlock('first');
        unsub();
        bus.emitScrollToBlock('second');
        expect(seen).toEqual(['first']);
    });

    it('the underlying bus is exposed for untyped subscribers', () => {
        const seen: string[] = [];
        const unsub = bus.bus.subscribe((e) => seen.push(e.type));
        bus.emitScrollToBlock('x');
        bus.emitHighlightBlock('y');
        unsub();
        bus.emitNavigateTo('z');
        expect(seen).toEqual([
            'workbench:scroll-to-block',
            'workbench:highlight-block',
        ]);
    });
});
