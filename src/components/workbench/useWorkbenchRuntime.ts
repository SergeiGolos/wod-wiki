import { useCallback, useEffect, useRef } from 'react';
import { useRuntimeLifecycle } from '../layout/RuntimeLifecycleProvider';
import { useWorkoutEvents } from '../../hooks/useWorkoutEvents';
import { useRuntimeExecution, NextEvent, RegisterEventHandlerAction, UnregisterEventHandlerAction } from '../../hooks/useRuntimeTimer';
import type { IEventHandler, IEvent, IScriptRuntime } from '../../hooks/useRuntimeTimer';
import { audioService } from '@/hooks/useBrowserServices';
import type { WorkoutEvent } from '@/hooks/useBrowserServices';
import type { WorkoutResults, WodBlock } from '../Editor/types';
import { toStoredOutputStatement } from '../Editor/types';
import { AnalyticsEngine } from '../../core/analytics/AnalyticsEngine';
import { StandardAnalyticsProfile } from '../../core/analytics/StandardAnalyticsProfile';
import type { AnalyticsProfileContext } from '../../core/analytics/IAnalyticsProfile';
import type { AnalyticsContext } from '../../core/analytics/AnalyticsContext';
import { MetricType } from '../../core/models/Metric';
import { CompositeEffortRegistry, EffortResolver } from '@/effort-registry';

/**
 * Hook to encapsulate Workbench runtime logic.
 */
export const useWorkbenchRuntime = <T extends WodBlock | null = WodBlock | null>(
    _viewMode: string,
    _selectedBlock: T,
    completeWorkout: (results: WorkoutResults) => void,
    startWorkout: (block: WodBlock) => void
) => {
    const { runtime, initializeRuntime, disposeRuntime } = useRuntimeLifecycle();
    const execution = useRuntimeExecution(runtime);
    const latestRef = useRef({ runtime, execution, completeWorkout });
    latestRef.current = { runtime, execution, completeWorkout };

    // Register Global Audio Handler when runtime is available
    useEffect(() => {
        if (runtime) {
            const audioHandler: IEventHandler = {
                id: 'global-audio-handler',
                name: 'GlobalAudioHandler',
                handler: (event: IEvent, _runtime: IScriptRuntime) => {
                    if (event.name === 'sound:play' && event.data) {
                        const { sound, volume } = event.data as { sound: string, volume?: number };
                        if (sound) {
                            audioService.playSound(sound, volume).catch(() => {
                                // Sound playback failed silently
                            });
                        }
                    }
                    return [];
                }
            };

            // Register the handler
            const action = new RegisterEventHandlerAction(audioHandler, 'global');
            action.do(runtime);

            // Setup Analytics Engine — profile-based assembly
            const engine = new AnalyticsEngine();

            // Build profile context from selected block
            const dialect = _selectedBlock?.dialect || 'wod';
            const scriptMetricTypes = new Set<MetricType>();
            if (_selectedBlock?.statements) {
                for (const stmt of _selectedBlock.statements) {
                    for (const metric of stmt.metrics) {
                        scriptMetricTypes.add(metric.type);
                    }
                }
            }

            // Construct effort resolver from bundled registry
            const registry = new CompositeEffortRegistry();
            registry.loadBundled();
            const analyticsContext: AnalyticsContext = {
                effortResolver: new EffortResolver(registry),
            };

            // Make analytics context available to runtime for compile-time enrichment
            runtime.analyticsContext = analyticsContext;

            const context: AnalyticsProfileContext = { dialect, scriptMetricTypes, analyticsContext };

            const profile = new StandardAnalyticsProfile();
            const { realtime, summary } = profile.build(context);

            for (const processor of realtime) {
                engine.addRealtimeProcessor(processor);
            }
            for (const processor of summary) {
                engine.addSummaryProcessor(processor);
            }

            // Wire tracker for live per-segment metric card updates
            if (runtime.tracker) {
                engine.setTracker(runtime.tracker);
            }

            runtime.setAnalyticsEngine(engine);

            // Cleanup on unmount or runtime change
            return () => {
                const unregisterAction = new UnregisterEventHandlerAction('global-audio-handler');
                unregisterAction.do(runtime);
            };
        }
    }, [runtime]);

    // Save partial results on unmount if workout is still running/paused
    useEffect(() => {
        return () => {
            // Check current execution status from the hook's scope (using refs or direct)
            // Since execution is a proxy/state from another hook, we need to be careful.
            // But execution.status/startTime/elapsedTime should be available in the closure for cleanup.

            const isFinishing = execution.status === 'running' || execution.status === 'paused';
            if (isFinishing && execution.startTime) {
                console.log('[useWorkbenchRuntime] Saving partial workout results on unmount');
                completeWorkout({
                    startTime: execution.startTime,
                    endTime: Date.now(),
                    duration: execution.elapsedTime,
                    completed: false // Explicitly marked as partial
                });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [completeWorkout]); // Minimal deps to ensure it runs on unmount with final values in closure

    // Auto-complete: when the runtime stack empties (all blocks done),
    // save output statements and navigate to review automatically.
    useEffect(() => {
        if (execution.status === 'completed' && execution.startTime) {
            // Finalize summary metrics before completion
            runtime?.finalizeAnalytics();

            completeWorkout({
                startTime: execution.startTime,
                endTime: Date.now(),
                duration: execution.elapsedTime,
                logs: (runtime?.getOutputStatements() || []).map(toStoredOutputStatement),
                completed: true
            });
        }
    }, [execution.status]); // Only fires on status transition to 'completed'

    // Initialize runtime when entering track view with selected block
    // Note: Consumer needs to use useEffect to call initializeRuntime/disposeRuntime based on viewMode/selectedBlock
    // This hook just provides the callbacks and state

    const handleStart = useCallback(() => latestRef.current.execution.start(), []);
    const handlePause = useCallback(() => latestRef.current.execution.pause(), []);
    const handleStop = useCallback(() => {
        const { runtime, execution, completeWorkout } = latestRef.current;

        execution.stop();
        // Finalize summary metrics before completion
        runtime?.finalizeAnalytics();
        
        completeWorkout({
            startTime: execution.startTime || Date.now(),
            endTime: Date.now(),
            duration: execution.elapsedTime,
            logs: (runtime?.getOutputStatements() || []).map(toStoredOutputStatement),
            completed: true
        });
    }, []);

    const handleNext = useCallback(() => {
        const { runtime, execution } = latestRef.current;

        if (runtime && execution.status !== 'completed') {
            runtime.handle(new NextEvent());
            if (execution.status !== 'running') {
                execution.start();
            }
        }
    }, []);

    const handleStartWorkoutAction = useCallback((block: WodBlock) => {
        startWorkout(block);
    }, [startWorkout]);

    const handleWorkoutEvent = useCallback((event: WorkoutEvent) => {
        switch (event.type) {
            case 'start-workout':
                handleStartWorkoutAction(event.block);
                break;
            case 'stop-workout':
                completeWorkout(event.results);
                break;
            case 'pause-workout':
                execution.pause();
                break;
            case 'resume-workout':
                execution.start();
                break;
            case 'next-segment':
                if (runtime) {
                    runtime.handle(new NextEvent());
                    if (execution.status !== 'running') {
                        execution.start();
                    }
                }
                break;
        }
    }, [handleStartWorkoutAction, completeWorkout, execution, runtime]);

    useWorkoutEvents(handleWorkoutEvent, [handleWorkoutEvent]);

    return {
        runtime,
        initializeRuntime,
        disposeRuntime,
        execution,
        handleStart,
        handlePause,
        handleStop,
        handleNext,
        handleStartWorkoutAction
    };
};
