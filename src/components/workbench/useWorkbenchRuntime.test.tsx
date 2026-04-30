import React from 'react';
import { describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';

import { RuntimeLifecycleContext } from '../layout/RuntimeLifecycleContext';
import type { WorkoutResults, WodBlock } from '../Editor/types';

mock.module('@/hooks/useBrowserServices', () => ({
    audioService: {
        playSound: mock(() => Promise.resolve())
    }
}));

describe('useWorkbenchRuntime', () => {
    it('keeps control handler references stable across unchanged rerenders', async () => {
        const { useWorkbenchRuntime } = await import('./useWorkbenchRuntime');
        const lifecycle = {
            runtime: null,
            isInitializing: false,
            error: null,
            initializeRuntime: mock(() => { }),
            disposeRuntime: mock(() => { })
        };

        const completeWorkout = mock((_results: WorkoutResults) => { });
        const startWorkout = mock((_block: WodBlock) => { });
        const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
            <RuntimeLifecycleContext.Provider value={lifecycle}>
                {children}
            </RuntimeLifecycleContext.Provider>
        );

        const { result, rerender } = renderHook(
            ({ viewMode, selectedBlock }) =>
                useWorkbenchRuntime(viewMode, selectedBlock, completeWorkout, startWorkout),
            {
                wrapper,
                initialProps: {
                    viewMode: 'plan',
                    selectedBlock: null as WodBlock | null
                }
            }
        );

        const firstHandlers = {
            handleStart: result.current.handleStart,
            handlePause: result.current.handlePause,
            handleStop: result.current.handleStop,
            handleNext: result.current.handleNext,
            handleStartWorkoutAction: result.current.handleStartWorkoutAction
        };

        rerender({
            viewMode: 'plan',
            selectedBlock: null
        });

        expect(result.current.handleStart).toBe(firstHandlers.handleStart);
        expect(result.current.handlePause).toBe(firstHandlers.handlePause);
        expect(result.current.handleStop).toBe(firstHandlers.handleStop);
        expect(result.current.handleNext).toBe(firstHandlers.handleNext);
        expect(result.current.handleStartWorkoutAction).toBe(firstHandlers.handleStartWorkoutAction);

        const originalWarn = console.warn;
        const warnSpy = mock(() => { });
        console.warn = warnSpy as unknown as typeof console.warn;
        try {
            act(() => {
                result.current.handleStart();
            });
            expect(warnSpy).toHaveBeenCalledTimes(1);
        } finally {
            console.warn = originalWarn;
        }
    });
});
