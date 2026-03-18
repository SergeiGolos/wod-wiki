import { describe, it, expect } from 'bun:test';
import {
    createSessionContext,
    startSession,
    userNext,
    disposeSession,
} from '../jit-compilation/helpers/session-test-utils';
import { MetricType } from '@/core/models/Metric';

describe('Diagnostic4 — detailed clean/snatch metrics', () => {
    it('Override: show what metrics Clean and Snatch get', () => {
        const ctx = createSessionContext('95 lb\n  Clean 135 lb\n  Snatch');
        startSession(ctx);
        userNext(ctx); // advance to Clean
        console.log('\n--- On Clean ---');
        const clean = ctx.runtime.stack.current;
        console.log('block:', clean?.blockType, clean?.label);
        const cleanMem = clean?.getAllMemory() ?? [];
        cleanMem.forEach(loc => console.log('  ', loc.tag, JSON.stringify(loc.metrics.map(m => ({type: m.type, value: m.value, origin: m.origin})))));
        
        userNext(ctx); // advance to Snatch
        console.log('\n--- On Snatch ---');
        const snatch = ctx.runtime.stack.current;
        console.log('block:', snatch?.blockType, snatch?.label);
        const snatchMem = snatch?.getAllMemory() ?? [];
        snatchMem.forEach(loc => console.log('  ', loc.tag, JSON.stringify(loc.metrics.map(m => ({type: m.type, value: m.value, origin: m.origin})))));
        
        disposeSession(ctx);
        expect(true).toBe(true);
    });
    
    it('Cascade: show what Clean & Jerk gets from 95 lb / (3)', () => {
        const ctx = createSessionContext('95 lb\n(3)\n  Clean & Jerk');
        startSession(ctx);
        userNext(ctx); // advance past WTS → goes to first child
        console.log('\n--- Stack after userNext #1 ---');
        ctx.runtime.stack.blocks.forEach(b => {
            const allMem = b.getAllMemory();
            console.log('  block:', b.blockType, b.label);
            allMem.filter(loc => loc.tag.startsWith('metric:')).forEach(loc => console.log('    ', loc.tag, JSON.stringify(loc.metrics.map(m => ({type: m.type, value: m.value})))));
        });
        userNext(ctx); // advance to next
        console.log('\n--- Stack after userNext #2 ---');
        ctx.runtime.stack.blocks.forEach(b => {
            const allMem = b.getAllMemory();
            console.log('  block:', b.blockType, b.label);
            allMem.filter(loc => loc.tag.startsWith('metric:')).forEach(loc => console.log('    ', loc.tag, JSON.stringify(loc.metrics.map(m => ({type: m.type, value: m.value})))));
        });
        disposeSession(ctx);
        expect(true).toBe(true);
    });
});
