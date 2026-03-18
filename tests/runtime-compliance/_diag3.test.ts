import { describe, it, expect } from 'bun:test';
import {
    createSessionContext,
    startSession,
    userNext,
    disposeSession,
} from '../jit-compilation/helpers/session-test-utils';
import { MetricPromotionBehavior } from '@/runtime/behaviors/MetricPromotionBehavior';

describe('Diagnostic3 — MetricPromotionBehavior wiring', () => {
    it('Group block has MetricPromotionBehavior', () => {
        const ctx = createSessionContext('95 lb\n  Clean 135 lb\n  Snatch');
        startSession(ctx);
        userNext(ctx); // advance to Clean
        const group = ctx.runtime.stack.blocks.find(b => b.blockType === 'Group');
        console.log('Group block:', group?.blockType, group?.label);
        console.log('Group behaviors:', [...(group?.behaviors ?? [])].map(b => b.constructor.name));
        if (group) {
            const allMem = group.getAllMemory();
            console.log('Group ALL memory:');
            allMem.forEach(loc => console.log('  ', loc.tag, JSON.stringify(loc.metrics.map(m => ({type: m.type, value: m.value, origin: m.origin})))));
            const promote = group.getMemoryByTag('metric:promote');
            console.log('metric:promote:', JSON.stringify(promote));
        }
        disposeSession(ctx);
        expect(true).toBe(true);
    });

    it('Cascade: 95 lb / (3) / Clean — after first userNext, check stack', () => {
        const ctx = createSessionContext('95 lb\n(3)\n  Clean & Jerk');
        startSession(ctx);
        userNext(ctx); // skip WaitingToStart
        console.log('\nStack after first userNext:');
        ctx.runtime.stack.blocks.forEach(b => {
            const mems = b.getMemoryByTag('metric:display').flatMap(l => l.metrics);
            const prom = b.getMemoryByTag('metric:promote').flatMap(l => l.metrics);
            console.log(`  ${b.blockType}(${b.label}) display=[${mems.map(m=>m.type+':'+JSON.stringify(m.value)).join(',')}] promote=[${prom.map(m=>m.type+':'+JSON.stringify(m.value)).join(',')}]`);
        });
        disposeSession(ctx);
        expect(true).toBe(true);
    });
});
