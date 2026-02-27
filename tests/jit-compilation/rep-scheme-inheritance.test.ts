import { describe, it, expect, afterEach } from 'bun:test';
import {
    createSessionContext,
    startSession,
    userNext,
    stackInfo,
    disposeSession,
    type SessionTestContext,
} from './helpers/session-test-utils';
import { FragmentType } from '@/core/models/CodeFragment';

describe('Rep-Scheme Inheritance', () => {
    let ctx: SessionTestContext;

    afterEach(() => {
        if (ctx) disposeSession(ctx);
    });

    it('should inherit correct reps in each round of a 21-15-9 scheme', () => {
        ctx = createSessionContext(`(21-15-9)
  pushups
  situps`);
        startSession(ctx);

        // User starts — WaitingToStart pops, Rounds block pushed, first child (pushups) pushed
        userNext(ctx);

        // --- Round 1 (21 reps) ---
        let pushups = ctx.runtime.stack.current;
        expect(pushups?.label).toContain('pushups');
        
        let repFragment = pushups?.getMemoryByTag('fragment:display')
            .flatMap(loc => loc.fragments)
            .find(f => f.fragmentType === FragmentType.Rep);
        
        // Check inherited rep via memory
        expect(repFragment?.value).toBe(21);

        userNext(ctx); // pushups complete -> situps pushed
        
        let situps = ctx.runtime.stack.current;
        expect(situps?.label).toContain('situps');
        repFragment = situps?.getMemoryByTag('fragment:display')
            .flatMap(loc => loc.fragments)
            .find(f => f.fragmentType === FragmentType.Rep);
        expect(repFragment?.value).toBe(21);

        userNext(ctx); // situps complete -> Round 2 starts, pushups pushed

        // --- Round 2 (15 reps) ---
        pushups = ctx.runtime.stack.current;
        expect(pushups?.label).toContain('pushups');
        repFragment = pushups?.getMemoryByTag('fragment:display')
            .flatMap(loc => loc.fragments)
            .find(f => f.fragmentType === FragmentType.Rep);
        
        // This used to be stale (21)
        expect(repFragment?.value).toBe(15);

        userNext(ctx); // pushups complete -> situps pushed
        situps = ctx.runtime.stack.current;
        repFragment = situps?.getMemoryByTag('fragment:display')
            .flatMap(loc => loc.fragments)
            .find(f => f.fragmentType === FragmentType.Rep);
        expect(repFragment?.value).toBe(15);

        userNext(ctx); // situps complete -> Round 3 starts, pushups pushed

        // --- Round 3 (9 reps) ---
        pushups = ctx.runtime.stack.current;
        repFragment = pushups?.getMemoryByTag('fragment:display')
            .flatMap(loc => loc.fragments)
            .find(f => f.fragmentType === FragmentType.Rep);
        expect(repFragment?.value).toBe(9);

        userNext(ctx); // pushups complete -> situps pushed
        situps = ctx.runtime.stack.current;
        repFragment = situps?.getMemoryByTag('fragment:display')
            .flatMap(loc => loc.fragments)
            .find(f => f.fragmentType === FragmentType.Rep);
        expect(repFragment?.value).toBe(9);

        userNext(ctx); // situps complete -> Rounds block complete -> Session complete
        expect(ctx.runtime.stack.count).toBe(0);
    });
});
