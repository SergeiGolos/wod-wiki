import React from 'react';
import { describe, expect, it, mock } from 'bun:test';
import { act, renderHook } from '@testing-library/react';

import { RuntimeLifecycleContext } from '@/contexts/RuntimeLifecycleContext';
import type { WorkoutResults, ScriptBlock } from '@/components/Editor/types';
import { MetricContainer } from '@bitcobblers/wod-wiki-engine';
import { MetricType } from '@bitcobblers/wod-wiki-engine';
// Preserve all original exports while overriding audioService for this test.
const originalUseBrowserServices = await import('@/hooks/useBrowserServices');

mock.module('@/hooks/useBrowserServices', () => ({
    ...originalUseBrowserServices,
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
        const startWorkout = mock((_block: ScriptBlock) => { });
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
                    selectedBlock: null as ScriptBlock | null
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

    it('does not duplicate analytics assembly — engine is wired by RuntimeFactory', async () => {
        const { useWorkbenchRuntime } = await import('./useWorkbenchRuntime');
        const setAnalyticsEngine = mock((_engine: unknown) => { });
        const mockRuntime = {
            tracker: { recordMetric: mock(() => { }) },
            setAnalyticsEngine,
            handle: mock(() => { }),
            finalizeAnalytics: mock(() => []),
            getOutputStatements: mock(() => []),
            subscribeToStack: mock(() => mock(() => { })),
            eventBus: { register: mock(() => mock(() => { })), dispatch: mock(() => { }), unregisterById: mock(() => { }) }
        };

        const lifecycle = {
            runtime: mockRuntime as unknown as RuntimeLifecycleContextValue['runtime'],
            isInitializing: false,
            error: null,
            initializeRuntime: mock(() => { }),
            disposeRuntime: mock(() => { })
        };

        const completeWorkout = mock((_results: WorkoutResults) => { });
        const startWorkout = mock((_block: ScriptBlock) => { });
        const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
            <RuntimeLifecycleContext.Provider value={lifecycle}>
                {children}
            </RuntimeLifecycleContext.Provider>
        );

        const selectedBlock: ScriptBlock = {
            id: 'test-block',
            dialect: 'time',
            startLine: 0,
            endLine: 2,
            content: '10 Pushups',
            statements: [
                {
                    id: 1,
                    metrics: MetricContainer.from([
                        { type: MetricType.Rep, image: '10', value: '10' },
                        { type: MetricType.Resistance, image: 'BW', value: 'BW' }
                    ], 1)
                } as unknown as ICodeStatement
            ],
            state: 'parsed',
            widgetIds: {},
            version: 1,
            createdAt: Date.now()
        };

        renderHook(
            () => useWorkbenchRuntime('track', selectedBlock, completeWorkout, startWorkout),
            { wrapper }
        );

        // Analytics engine assembly is now handled by RuntimeFactory.createRuntime().
        // useWorkbenchRuntime must NOT call setAnalyticsEngine again.
        expect(setAnalyticsEngine).not.toHaveBeenCalled();
    });

    it('finalizes analytics and persists logs on the unmount partial-save path', async () => {
        const { useWorkbenchRuntime } = await import('./useWorkbenchRuntime');
        const { OutputStatement } = await import('@bitcobblers/wod-wiki-engine');

        const finalizeAnalytics = mock(() => []);
        // Post-fix, getOutputStatements() holds finalized analytics only (live
        // Tier-2 totals stay ephemeral). The partial-save path persists exactly
        // what the buffer reports.
        const persistedOutput = new OutputStatement({
            outputType: 'analytics',
            timeSpan: { started: 1, ended: 2 },
            sourceBlockKey: 'block-1',
            stackLevel: 0,
            metrics: MetricContainer.empty('seg-1')
        });
        const getOutputStatements = mock(() => [persistedOutput]);
        const mockRuntime = {
            tracker: { recordMetric: mock(() => { }) },
            setAnalyticsEngine: mock(() => { }),
            handle: mock(() => { }),
            finalizeAnalytics,
            getOutputStatements,
            subscribeToStack: mock(() => mock(() => { })),
            eventBus: { register: mock(() => mock(() => { })), dispatch: mock(() => { }), unregisterById: mock(() => { }) }
        };

        const lifecycle = {
            // Structural mock — only the surface the hook touches.
            runtime: mockRuntime as unknown as import('@bitcobblers/wod-wiki-engine').ScriptRuntime,
            isInitializing: false,
            error: null,
            initializeRuntime: mock(() => { }),
            disposeRuntime: mock(() => { })
        };

        const completeWorkout = mock((_results: WorkoutResults) => { });
        const startWorkout = mock((_block: ScriptBlock) => { });
        const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
            <RuntimeLifecycleContext.Provider value={lifecycle}>
                {children}
            </RuntimeLifecycleContext.Provider>
        );

        const { result, unmount } = renderHook(
            () => useWorkbenchRuntime('track', null, completeWorkout, startWorkout),
            { wrapper }
        );

        // Drive the execution state to 'running' so the unmount cleanup takes
        // the partial-save branch.
        act(() => {
            result.current.handleStart();
        });

        unmount();

        // Same finalize + logs contract as the formal completion paths.
        expect(finalizeAnalytics).toHaveBeenCalledTimes(1);
        expect(completeWorkout).toHaveBeenCalledTimes(1);
        const saved = completeWorkout.mock.calls[0]?.[0] as WorkoutResults;
        expect(saved.completed).toBe(false);
        expect(saved.logs).toHaveLength(1);
        expect(saved.logs?.[0]).toMatchObject({ outputType: 'analytics', sourceBlockKey: 'block-1' });
    });
});
