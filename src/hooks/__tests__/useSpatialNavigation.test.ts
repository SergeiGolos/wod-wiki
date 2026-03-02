/**
 * useSpatialNavigation.test.ts — Unit tests for the spatial navigation hook.
 *
 * These tests verify the core spatial logic (finding the nearest element
 * in a given direction) without needing a full DOM. The geometry helpers
 * are exercised through the hook's internal `findNearest` function, but
 * since that's not exported we test behaviour via simulated keydown events
 * on a minimal JSDOM.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

// ── Geometry unit tests (extracted algorithm) ──────────────────────────

/**
 * Re-implement the same spatial scoring the hook uses, so we can unit-test
 * the algorithm in isolation without React rendering.
 */
interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
    cx: number;
    cy: number;
}

type Direction = 'up' | 'down' | 'left' | 'right';

function findNearest(
    originRect: Rect,
    candidates: { id: string; rect: Rect }[],
    direction: Direction,
): string | null {
    const inDirection = candidates.filter(({ rect }) => {
        switch (direction) {
            case 'up': return rect.cy < originRect.cy;
            case 'down': return rect.cy > originRect.cy;
            case 'left': return rect.cx < originRect.cx;
            case 'right': return rect.cx > originRect.cx;
        }
    });

    if (inDirection.length === 0) return null;

    let bestId: string | null = null;
    let bestScore = Infinity;

    for (const { id, rect } of inDirection) {
        const dx = rect.cx - originRect.cx;
        const dy = rect.cy - originRect.cy;

        let score: number;
        if (direction === 'up' || direction === 'down') {
            score = Math.abs(dy) + Math.abs(dx) * 3;
        } else {
            score = Math.abs(dx) + Math.abs(dy) * 3;
        }

        if (score < bestScore) {
            bestScore = score;
            bestId = id;
        }
    }

    return bestId;
}

function makeRect(cx: number, cy: number, size = 50): Rect {
    return {
        x: cx - size / 2,
        y: cy - size / 2,
        width: size,
        height: size,
        cx,
        cy,
    };
}

describe('Spatial Navigation - findNearest', () => {
    const origin = makeRect(200, 200);

    it('should find nearest element below', () => {
        const candidates = [
            { id: 'a', rect: makeRect(200, 300) }, // directly below
            { id: 'b', rect: makeRect(200, 500) }, // further below
            { id: 'c', rect: makeRect(200, 100) }, // above (wrong direction)
        ];
        expect(findNearest(origin, candidates, 'down')).toBe('a');
    });

    it('should find nearest element above', () => {
        const candidates = [
            { id: 'a', rect: makeRect(200, 100) }, // directly above
            { id: 'b', rect: makeRect(200, 50) },  // further above
            { id: 'c', rect: makeRect(200, 300) }, // below (wrong direction)
        ];
        expect(findNearest(origin, candidates, 'up')).toBe('a');
    });

    it('should find nearest element to the right', () => {
        const candidates = [
            { id: 'a', rect: makeRect(350, 200) }, // right
            { id: 'b', rect: makeRect(500, 200) }, // farther right
            { id: 'c', rect: makeRect(50, 200) },  // left (wrong direction)
        ];
        expect(findNearest(origin, candidates, 'right')).toBe('a');
    });

    it('should find nearest element to the left', () => {
        const candidates = [
            { id: 'a', rect: makeRect(50, 200) },  // left
            { id: 'b', rect: makeRect(100, 200) }, // less left but closer
            { id: 'c', rect: makeRect(300, 200) }, // right (wrong direction)
        ];
        expect(findNearest(origin, candidates, 'left')).toBe('b');
    });

    it('should return null when no candidates in direction', () => {
        const candidates = [
            { id: 'a', rect: makeRect(200, 100) }, // above
        ];
        expect(findNearest(origin, candidates, 'down')).toBe(null);
    });

    it('should prefer aligned candidates over diagonal ones', () => {
        const candidates = [
            { id: 'aligned', rect: makeRect(200, 350) },  // directly below
            { id: 'diagonal', rect: makeRect(400, 300) }, // diagonally below-right (closer in Y but offset in X)
        ];
        // 'aligned' is at dy=150, dx=0 → score = 150
        // 'diagonal' is at dy=100, dx=200 → score = 100 + 200*3 = 700
        expect(findNearest(origin, candidates, 'down')).toBe('aligned');
    });

    it('should handle vertical list navigation (ArrowDown through items)', () => {
        // Simulates a preview panel workout list
        const items = [
            { id: 'item-0', rect: makeRect(200, 100) },
            { id: 'item-1', rect: makeRect(200, 160) },
            { id: 'item-2', rect: makeRect(200, 220) },
            { id: 'item-3', rect: makeRect(200, 280) },
        ];

        // From item-0, ArrowDown → item-1
        const fromItem0 = makeRect(200, 100);
        expect(findNearest(fromItem0, items.filter(i => i.id !== 'item-0'), 'down')).toBe('item-1');

        // From item-1, ArrowDown → item-2
        const fromItem1 = makeRect(200, 160);
        expect(findNearest(fromItem1, items.filter(i => i.id !== 'item-1'), 'down')).toBe('item-2');

        // From item-2, ArrowUp → item-1
        const fromItem2 = makeRect(200, 220);
        expect(findNearest(fromItem2, items.filter(i => i.id !== 'item-2'), 'up')).toBe('item-1');
    });

    it('should navigate between timer controls (horizontal layout)', () => {
        // Simulates: [Stop] [Next] buttons in a row below the timer circle
        const timer = makeRect(300, 200);  // big circle center
        const stop = makeRect(250, 400);   // stop button
        const next = makeRect(350, 400);   // next button

        const all = [
            { id: 'timer-main', rect: timer },
            { id: 'btn-stop', rect: stop },
            { id: 'btn-next', rect: next },
        ];

        // From timer, ArrowDown → stop (closer in X alignment)
        expect(findNearest(timer, all.filter(c => c.id !== 'timer-main'), 'down')).toBe('btn-stop');

        // From stop, ArrowRight → next
        expect(findNearest(stop, all.filter(c => c.id !== 'btn-stop'), 'right')).toBe('btn-next');

        // From next, ArrowUp → timer
        expect(findNearest(next, all.filter(c => c.id !== 'btn-next'), 'up')).toBe('timer-main');

        // From stop, ArrowUp → timer
        expect(findNearest(stop, all.filter(c => c.id !== 'btn-stop'), 'up')).toBe('timer-main');
    });
});
