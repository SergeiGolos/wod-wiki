import { describe, it, expect } from 'bun:test';
import { startSpan, closeCurrentSpan, openSpan } from '../TimerSpans';
import { TimeSpan } from '../../models/TimeSpan';

describe('TimerSpans — pure span transforms', () => {
    describe('startSpan', () => {
        it('produces a single open span starting at now', () => {
            const spans = startSpan(1000);
            expect(spans).toHaveLength(1);
            expect(spans[0].started).toBe(1000);
            expect(spans[0].ended).toBeUndefined();
        });
    });

    describe('closeCurrentSpan', () => {
        it('closes the trailing open span at now', () => {
            const result = closeCurrentSpan(startSpan(1000), 2500);
            expect(result).toHaveLength(1);
            expect(result[0].started).toBe(1000);
            expect(result[0].ended).toBe(2500);
        });

        it('is a no-op when the trailing span is already closed', () => {
            const closed = [new TimeSpan(1000, 2000)];
            const result = closeCurrentSpan(closed, 3000);
            expect(result[0].ended).toBe(2000);
        });

        it('leaves earlier closed spans untouched', () => {
            const spans = [new TimeSpan(0, 500), new TimeSpan(800)];
            const result = closeCurrentSpan(spans, 1200);
            expect(result[0].ended).toBe(500);
            expect(result[1].ended).toBe(1200);
        });

        it('returns an empty list for empty input', () => {
            expect(closeCurrentSpan([], 1000)).toEqual([]);
        });
    });

    describe('openSpan', () => {
        it('appends a new open span after a closed one (resume)', () => {
            const closed = [new TimeSpan(0, 500)];
            const result = openSpan(closed, 900);
            expect(result).toHaveLength(2);
            expect(result[1].started).toBe(900);
            expect(result[1].ended).toBeUndefined();
        });
    });

    describe('pause / resume round-trip', () => {
        it('accumulates active spans and excludes the paused gap', () => {
            // mount at 0 → pause at 1000 → resume at 1500 → unmount at 2000
            let spans: readonly TimeSpan[] = startSpan(0);
            spans = closeCurrentSpan(spans, 1000); // pause
            spans = openSpan(spans, 1500);         // resume
            spans = closeCurrentSpan(spans, 2000); // unmount

            const elapsed = spans.reduce((sum, s) => sum + ((s.ended ?? 0) - s.started), 0);
            expect(spans).toHaveLength(2);
            expect(elapsed).toBe(1500); // 1000 active + 500 active, 500 paused excluded
        });
    });
});
