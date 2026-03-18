import { describe, it, expect } from 'bun:test';
import {
    createSessionContext,
    startSession,
    userNext,
    disposeSession,
} from '../jit-compilation/helpers/session-test-utils';
import { MetricType } from '@/core/models/Metric';
import { sharedParser } from '@/parser/parserInstance';
import { WodScript } from '@/parser/WodScript';

function dumpScript(label: string, text: string) {
    const script = sharedParser.read(text) as WodScript;
    console.log(`\n=== ${label} ===`);
    script.statements.forEach((s, i) => {
        console.log(`  stmt[${i}] depth=${s.depth} metrics=${JSON.stringify(s.metrics.map(m=>({type:m.type,value:m.value})))}`);
    });
}

describe('Diagnostic — parser AST', () => {
    it('parses 95 lb / (3) / Clean & Jerk', () => {
        dumpScript('95 lb cascade', '95 lb\n(3)\n  Clean & Jerk');
        expect(true).toBe(true);
    });

    it('parses 95 lb / Clean 135 lb / Snatch (override)', () => {
        dumpScript('95 lb override', '95 lb\n  Clean 135 lb\n  Snatch');
        expect(true).toBe(true);
    });

    it('parses 5 Thrusters 95 lb / 10 Pushups (sibling isolation)', () => {
        dumpScript('AMRAP sibling', '10:00 AMRAP\n  5 Thrusters 95 lb\n  10 Pushups');
        expect(true).toBe(true);
    });

    it('parses 400 m / (3) / Run', () => {
        dumpScript('400 m cascade', '400 m\n(3)\n  Run');
        expect(true).toBe(true);
    });

    it('parses 75 kg / EMOM / rounds / Clean', () => {
        dumpScript('75 kg three-level', '75 kg\n(5) 1:00 EMOM\n  (3)\n    Clean');
        expect(true).toBe(true);
    });

    it('runtime: what blocks does 95 lb / (3) / Clean compile to?', () => {
        const ctx = createSessionContext('95 lb\n(3)\n  Clean & Jerk');
        startSession(ctx);
        console.log('\n=== Compiled blocks after startSession ===');
        ctx.runtime.stack.blocks.forEach(b => {
            const mems = b.getMemoryByTag('metric:display').flatMap(l => l.metrics);
            console.log(`  block: ${b.blockType}(${b.label}) metrics=[${mems.map(m=>m.type+':'+JSON.stringify(m.value)).join(', ')}]`);
        });
        userNext(ctx); // advance past waiting
        console.log('\n=== After first userNext ===');
        ctx.runtime.stack.blocks.forEach(b => {
            const mems = b.getMemoryByTag('metric:display').flatMap(l => l.metrics);
            console.log(`  block: ${b.blockType}(${b.label}) metrics=[${mems.map(m=>m.type+':'+JSON.stringify(m.value)).join(', ')}]`);
        });
        userNext(ctx); // advance to 2nd block
        console.log('\n=== After second userNext ===');
        ctx.runtime.stack.blocks.forEach(b => {
            const mems = b.getMemoryByTag('metric:display').flatMap(l => l.metrics);
            console.log(`  block: ${b.blockType}(${b.label}) metrics=[${mems.map(m=>m.type+':'+JSON.stringify(m.value)).join(', ')}]`);
        });
        disposeSession(ctx);
        expect(true).toBe(true);
    });

    it('runtime: what blocks does 95 lb / Clean 135 lb / Snatch compile to?', () => {
        const ctx = createSessionContext('95 lb\n  Clean 135 lb\n  Snatch');
        startSession(ctx);
        userNext(ctx); // Clean
        console.log('\n=== Override: at Clean ===');
        ctx.runtime.stack.blocks.forEach(b => {
            const mems = b.getMemoryByTag('metric:display').flatMap(l => l.metrics);
            console.log(`  block: ${b.blockType}(${b.label}) all-mem-tags=[${b.getMemoryByTag('metric:display').map(l=>l.tag+':'+JSON.stringify(l.metrics.map(m=>m.type))).join('|')}]`);
        });
        // Also check promote memory
        const group = ctx.runtime.stack.blocks.find(b => b.blockType !== 'effort' && b.blockType !== 'SessionRoot');
        if (group) {
            const promote = group.getMemoryByTag('metric:promote');
            const priv = group.getMemoryByTag('metric:private');
            console.log('group promote:', JSON.stringify(promote));
            console.log('group private:', JSON.stringify(priv));
        }
        disposeSession(ctx);
        expect(true).toBe(true);
    });
});
