import { describe, it } from 'bun:test';
import { createSessionContext, startSession, userNext, disposeSession } from '../jit-compilation/helpers/session-test-utils';

describe('perf breakdown', () => {
    it('output type breakdown', () => {
        const ctx = createSessionContext('(100)\n  5 Burpees');
        startSession(ctx, { label: 'LargeCount' });
        userNext(ctx); // start

        for (let i = 0; i < 100; i++) {
            userNext(ctx);
        }
        
        // Count by type
        const types: Record<string, number> = {};
        for (const o of ctx.tracer.outputs) {
            types[o.outputType] = (types[o.outputType] || 0) + 1;
        }
        console.log('Output type counts for 100 rounds:', JSON.stringify(types, null, 2));
        console.log('Total outputs:', ctx.tracer.count);
        
        disposeSession(ctx);
    });
});
