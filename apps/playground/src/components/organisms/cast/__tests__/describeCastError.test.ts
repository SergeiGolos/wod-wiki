import { describe, it, expect } from 'bun:test';
import { describeCastError } from '../CastButtonRpc';

describe('describeCastError', () => {
    it('passes through Error messages', () => {
        expect(describeCastError(new Error('Cast session request failed: session_error')))
            .toBe('Cast session request failed: session_error');
    });

    it('formats CAF error objects as code: description', () => {
        expect(describeCastError({ code: 'session_error', description: 'Receiver failed to respond' }))
            .toBe('session_error: Receiver failed to respond');
    });

    it('handles objects with only a code', () => {
        expect(describeCastError({ code: 'cancel' })).toBe('cancel');
    });

    it('serializes plain objects instead of printing [object Object]', () => {
        const msg = describeCastError({ reason: 'TIMEOUT', ms: 15000 });
        expect(msg).toContain('TIMEOUT');
        expect(msg).not.toBe('[object Object]');
    });

    it('stringifies primitives', () => {
        expect(describeCastError('cancel')).toBe('cancel');
        expect(describeCastError(42)).toBe('42');
    });
});
