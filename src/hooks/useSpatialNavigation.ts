/**
 * useSpatialNavigation — Spatial focus management for TV remote (D-Pad) navigation.
 *
 * This hook manages a registry of focusable elements on screen and moves focus
 * between them based on directional arrow key input. It is designed for the
 * Chromecast Web Receiver "10-foot" experience where the only input device is
 * a standard TV remote with a D-Pad (Up/Down/Left/Right) and Select button.
 *
 * Elements register themselves by placing `data-nav-id` attributes. The hook
 * scans the DOM for these elements, tracks which one is currently focused,
 * and uses spatial proximity (bounding rect) to determine the next target
 * when an arrow key is pressed.
 *
 * Usage:
 * ```tsx
 * const { focusedId, getFocusProps } = useSpatialNavigation({
 *   onSelect: (id, el) => el.click(),
 * });
 *
 * <button {...getFocusProps('play-btn')}>Play</button>
 * <button {...getFocusProps('stop-btn')}>Stop</button>
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SpatialNavigationOptions {
    /** Called when the user presses Enter/Select on the focused element. */
    onSelect?: (elementId: string, element: HTMLElement) => void;
    /** When false, the hook is inert and does not intercept key events. */
    enabled?: boolean;
    /** Optional initial element to focus. */
    initialFocusId?: string;
    /**
     * CSS class applied to the currently focused element in addition to
     * the built-in `[data-nav-focused]` attribute. Defaults to `'tv-focus'`.
     */
    focusClassName?: string;
}

export interface FocusProps {
    'data-nav-id': string;
    'data-nav-focused': boolean;
    tabIndex: number;
    ref: (el: HTMLElement | null) => void;
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
    cx: number;
    cy: number;
}

function getRect(el: HTMLElement): Rect {
    const r = el.getBoundingClientRect();
    return {
        x: r.left,
        y: r.top,
        width: r.width,
        height: r.height,
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
    };
}

type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * For a given direction, filter candidate rects that lie in that direction
 * relative to `origin`, then pick the nearest one using a weighted distance
 * that favours alignment on the perpendicular axis.
 */
function findNearest(
    originRect: Rect,
    candidates: { id: string; rect: Rect }[],
    direction: Direction,
): string | null {
    // Filter candidates that are in the correct direction
    const inDirection = candidates.filter(({ rect }) => {
        switch (direction) {
            case 'up':
                return rect.cy < originRect.cy;
            case 'down':
                return rect.cy > originRect.cy;
            case 'left':
                return rect.cx < originRect.cx;
            case 'right':
                return rect.cx > originRect.cx;
        }
    });

    if (inDirection.length === 0) return null;

    // Score: weighted Euclidean distance.
    // Primary axis distance is weighted 1×, secondary (perpendicular) 3×.
    // This makes it prefer items that are roughly aligned on the off-axis.
    let bestId: string | null = null;
    let bestScore = Infinity;

    for (const { id, rect } of inDirection) {
        const dx = rect.cx - originRect.cx;
        const dy = rect.cy - originRect.cy;

        let score: number;
        if (direction === 'up' || direction === 'down') {
            // Primary axis is Y, secondary is X
            score = Math.abs(dy) + Math.abs(dx) * 3;
        } else {
            // Primary axis is X, secondary is Y
            score = Math.abs(dx) + Math.abs(dy) * 3;
        }

        if (score < bestScore) {
            bestScore = score;
            bestId = id;
        }
    }

    return bestId;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSpatialNavigation(options: SpatialNavigationOptions = {}) {
    const {
        onSelect,
        enabled = true,
        initialFocusId,
        focusClassName = 'tv-focus',
    } = options;

    const [focusedId, setFocusedId] = useState<string | null>(initialFocusId ?? null);
    const elementsRef = useRef<Map<string, HTMLElement>>(new Map());
    const focusedIdRef = useRef<string | null>(focusedId);

    // Keep ref in sync
    useEffect(() => {
        focusedIdRef.current = focusedId;
    }, [focusedId]);

    // ── Element registration via ref callback ────────────────────────────────

    const registerElement = useCallback((id: string, el: HTMLElement | null) => {
        if (el) {
            elementsRef.current.set(id, el);
            // Apply focus class immediately when the currently-focused element
            // registers (e.g., on initial mount when focusedId is already set).
            // Without this, the element registers AFTER the focusedId useEffect
            // fires, leaving it without a visible focus indicator.
            if (id === focusedIdRef.current) {
                el.classList.add(focusClassName);
                el.setAttribute('data-nav-focused', 'true');
            }
        } else {
            const existing = elementsRef.current.get(id);
            if (existing) {
                existing.classList.remove(focusClassName);
                existing.setAttribute('data-nav-focused', 'false');
            }
            elementsRef.current.delete(id);
        }
    }, [focusClassName]);

    // ── Apply / remove focus class ──────────────────────────────────────────

    useEffect(() => {
        if (!enabled) return;

        // Remove class from all, add to focused
        for (const [id, el] of elementsRef.current.entries()) {
            if (id === focusedId) {
                el.classList.add(focusClassName);
                el.setAttribute('data-nav-focused', 'true');
            } else {
                el.classList.remove(focusClassName);
                el.setAttribute('data-nav-focused', 'false');
            }
        }
    }, [focusedId, enabled, focusClassName]);

    // ── Keydown handler ─────────────────────────────────────────────────────

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const directionMap: Record<string, Direction> = {
                ArrowUp: 'up',
                ArrowDown: 'down',
                ArrowLeft: 'left',
                ArrowRight: 'right',
            };

            const direction = directionMap[e.key];

            // ── Arrow key → move focus ──────────────────────────────────
            if (direction) {
                e.preventDefault();

                const currentId = focusedIdRef.current;
                const elements = elementsRef.current;

                // If nothing is focused yet, focus the first registered element
                if (!currentId || !elements.has(currentId)) {
                    const firstId = elements.keys().next().value;
                    if (firstId) setFocusedId(firstId as string);
                    return;
                }

                const originEl = elements.get(currentId);
                if (!originEl) return;

                const originRect = getRect(originEl);

                const candidates: { id: string; rect: Rect }[] = [];
                for (const [id, el] of elements.entries()) {
                    if (id === currentId) continue;
                    // Only consider visible elements
                    if (el.offsetParent === null) continue;
                    candidates.push({ id, rect: getRect(el) });
                }

                const nextId = findNearest(originRect, candidates, direction);
                if (nextId) {
                    setFocusedId(nextId);
                }
                return;
            }

            // ── Enter / Select → activate ───────────────────────────────
            const isSelect =
                e.key === 'Enter' ||
                e.key === 'Select' ||
                e.key === 'Center' ||
                e.key === 'Ok' ||
                e.key === 'Accept' ||
                e.key === ' ' ||
                e.keyCode === 13 ||
                e.keyCode === 23 ||   // DPAD_CENTER
                e.keyCode === 32;

            const isPlayPause =
                e.key === 'MediaPlayPause' ||
                e.key === 'MediaPlay' ||
                e.key === 'MediaPause' ||
                e.keyCode === 179 ||  // MediaPlayPause
                e.keyCode === 126 ||  // MEDIA_PLAY (Android)
                e.keyCode === 127;    // MEDIA_PAUSE (Android)

            if (isSelect || isPlayPause) {
                e.preventDefault();
                const currentId = focusedIdRef.current;
                if (currentId) {
                    const el = elementsRef.current.get(currentId);
                    if (el && onSelect) {
                        onSelect(currentId, el);
                    }
                }
                return;
            }
        };

        // Use capture phase on document so we intercept key events BEFORE
        // the Cast Receiver SDK's own handlers can consume them.
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [enabled, onSelect]);

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Returns props to spread onto a focusable element.
     *
     * ```tsx
     * <button {...getFocusProps('my-btn')}>Click me</button>
     * ```
     */
    const getFocusProps = useCallback(
        (id: string): FocusProps => ({
            'data-nav-id': id,
            'data-nav-focused': focusedId === id,
            tabIndex: 0,
            ref: (el: HTMLElement | null) => registerElement(id, el),
        }),
        [focusedId, registerElement],
    );

    return {
        /** The ID of the currently focused element, or null. */
        focusedId,
        /** Programmatically move focus to a specific element. */
        setFocusedId,
        /** Spread these props onto any element that should participate in navigation. */
        getFocusProps,
    } as const;
}
