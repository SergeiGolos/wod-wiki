/**
 * receiver-rpc.test.tsx — Cross-mode focus transition tests for the Chromecast receiver.
 *
 * Verifies that spatial navigation is reset cleanly when the receiver transitions
 * between preview, active, and review modes (WOD-662).
 */

import React, { useEffect, useState } from 'react';
import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, act } from '@testing-library/react';
import { useSpatialNavigation } from './hooks/useSpatialNavigation';

// ── JSDOM polyfill ─────────────────────────────────────────────────────────
// JSDOM does not implement scrollIntoView; the hook calls it on focus changes.
if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
}

// ── Test harness: simulate mode-driven ReceiverApp focus behaviour ─────────

/**
 * Minimal harness that exercises the same focus-reset logic as ReceiverApp
 * without pulling in the full Cast SDK initialization.
 */
const FocusTransitionHarness: React.FC<{
    mode: 'idle' | 'preview' | 'active' | 'review';
    previewBlocks?: Array<{ id: string; title: string }>;
}> = ({ mode, previewBlocks = [] }) => {
    const [currentMode, setCurrentMode] = useState(mode);

    const { getFocusProps, reset, focusedId } = useSpatialNavigation({
        enabled: true,
        initialFocusId: currentMode === 'preview'
            ? 'preview-block-0'
            : currentMode === 'review'
                ? 'btn-dismiss'
                : 'btn-next',
    });

    // Cross-mode focus reset strategy (mirrors receiver-rpc.tsx WOD-662)
    useEffect(() => {
        if (currentMode === 'preview') {
            const targetId = previewBlocks.length > 0 ? 'preview-block-0' : null;
            reset(targetId);
        } else if (currentMode === 'active') {
            reset('btn-next');
        } else if (currentMode === 'review') {
            reset('btn-dismiss');
        } else {
            reset(null);
        }
    }, [currentMode, previewBlocks.length, reset]);

    return (
        <div>
            <div data-testid="focused-id">{focusedId ?? 'null'}</div>
            <button data-testid="set-preview" onClick={() => setCurrentMode('preview')}>Preview</button>
            <button data-testid="set-active" onClick={() => setCurrentMode('active')}>Active</button>
            <button data-testid="set-review" onClick={() => setCurrentMode('review')}>Review</button>
            <button data-testid="set-idle" onClick={() => setCurrentMode('idle')}>Idle</button>

            {currentMode === 'preview' && (
                <div key="preview">
                    {previewBlocks.map((block, index) => (
                        <button key={block.id} {...getFocusProps(`preview-block-${index}`)} data-testid={`preview-block-${index}`}>
                            {block.title}
                        </button>
                    ))}
                </div>
            )}

            {currentMode === 'active' && (
                <div key="active">
                    <button {...getFocusProps('btn-next')} data-testid="btn-next">Next</button>
                    <button {...getFocusProps('btn-stop')} data-testid="btn-stop">Stop</button>
                </div>
            )}

            {currentMode === 'review' && (
                <div key="review">
                    <button {...getFocusProps('btn-dismiss')} data-testid="btn-dismiss">Dismiss</button>
                </div>
            )}
        </div>
    );
};

describe('Cross-Mode Focus Transitions (WOD-662)', () => {
    afterEach(() => {
        cleanup();
    });

    it('should reset focus to preview-block-0 when entering preview mode', () => {
        const { getByTestId } = render(
            <FocusTransitionHarness mode="idle" previewBlocks={[{ id: 'b1', title: 'Fran' }]} />,
        );

        act(() => {
            getByTestId('set-preview').click();
        });

        expect(getByTestId('focused-id').textContent).toBe('preview-block-0');
        expect(getByTestId('preview-block-0').getAttribute('data-nav-focused')).toBe('true');
    });

    it('should reset focus to btn-next when entering active mode', () => {
        const { getByTestId } = render(
            <FocusTransitionHarness mode="preview" previewBlocks={[{ id: 'b1', title: 'Fran' }]} />,
        );

        act(() => {
            getByTestId('set-active').click();
        });

        expect(getByTestId('focused-id').textContent).toBe('btn-next');
        expect(getByTestId('btn-next').getAttribute('data-nav-focused')).toBe('true');
    });

    it('should reset focus to btn-dismiss when entering review mode', () => {
        const { getByTestId } = render(
            <FocusTransitionHarness mode="active" previewBlocks={[]} />,
        );

        act(() => {
            getByTestId('set-review').click();
        });

        expect(getByTestId('focused-id').textContent).toBe('btn-dismiss');
        expect(getByTestId('btn-dismiss').getAttribute('data-nav-focused')).toBe('true');
    });

    it('should clear all focus when entering idle mode', () => {
        const { getByTestId, queryByTestId } = render(
            <FocusTransitionHarness mode="active" previewBlocks={[]} />,
        );

        act(() => {
            getByTestId('set-idle').click();
        });

        expect(getByTestId('focused-id').textContent).toBe('null');
        expect(queryByTestId('btn-next')).toBeNull();
    });

    it('should remove focus class from old elements on mode transition', () => {
        const { getByTestId, queryByTestId } = render(
            <FocusTransitionHarness mode="preview" previewBlocks={[{ id: 'b1', title: 'Fran' }]} />,
        );

        act(() => {
            getByTestId('set-active').click();
        });

        // Old preview element should be unmounted (key change forces remount)
        expect(queryByTestId('preview-block-0')).toBeNull();

        // New active element should be focused
        expect(getByTestId('btn-next').getAttribute('data-nav-focused')).toBe('true');
    });

    it('should handle preview mode with no blocks by clearing focus', () => {
        const { getByTestId } = render(
            <FocusTransitionHarness mode="idle" previewBlocks={[]} />,
        );

        act(() => {
            getByTestId('set-preview').click();
        });

        expect(getByTestId('focused-id').textContent).toBe('null');
    });
});
