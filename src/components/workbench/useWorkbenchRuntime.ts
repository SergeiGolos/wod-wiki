import { useCallback, useEffect } from 'react';
import { useRuntimeLifecycle } from '../layout/RuntimeLifecycleProvider';
import { useWorkoutEvents } from '../../hooks/useWorkoutEvents';
import { useRuntimeExecution, NextEvent, RegisterEventHandlerAction, UnregisterEventHandlerAction } from '../../hooks/useRuntimeTimer';
import type { IEventHandler, IEvent, IScriptRuntime } from '../../hooks/useRuntimeTimer';
import { audioService } from '@/hooks/useBrowserServices';
import type { WorkoutEvent } from '@/hooks/useBrowserServices';
import type { WorkoutResults, WodBlock } from '../Editor/types';
import { AnalyticsEngine } from '../../core/analytics/AnalyticsEngine';
import { PaceEnrichmentProcess } from '../../core/analytics/PaceEnrichmentProcess';
import { PowerEnrichmentProcess } from '../../core/analytics/PowerEnrichmentProcess';

import { VolumeProjectionEngine } from '../../timeline/analytics/analytics/engines/VolumeProjectionEngine';
import { RepProjectionEngine } from '../../timeline/analytics/analytics/engines/RepProjectionEngine';
import { DistanceProjectionEngine } from '../../timeline/analytics/analytics/engines/DistanceProjectionEngine';
import { SessionLoadProjectionEngine } from '../../timeline/analytics/analytics/engines/SessionLoadProjectionEngine';
import { MetMinuteProjectionEngine } from '../../timeline/analytics/analytics/engines/MetMinuteProjectionEngine';

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

            // Setup Analytics Engine — unified pipeline via addStage()
            const engine = new AnalyticsEngine();
            engine.addStage(new PaceEnrichmentProcess());        // reps/distance + elapsed → pace (multiple units)
            engine.addStage(new PowerEnrichmentProcess());       // reps + resistance + elapsed → power

            // Wire tracker for live per-segment metric card updates
            if (runtime.tracker) {
                engine.setTracker(runtime.tracker);
            }

            engine.addStage(new RepProjectionEngine());
            engine.addStage(new DistanceProjectionEngine());
            engine.addStage(new VolumeProjectionEngine());
            engine.addStage(new SessionLoadProjectionEngine());
            engine.addStage(new MetMinuteProjectionEngine());

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
                    metrics: [],
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
                metrics: [],
                logs: runtime?.getOutputStatements() || [],
                completed: true
            });
        }
    }, [execution.status]); // Only fires on status transition to 'completed'

    // Initialize runtime when entering track view with selected block
    // Note: Consumer needs to use useEffect to call initializeRuntime/disposeRuntime based on viewMode/selectedBlock
    // This hook just provides the callbacks and state

    const handleStart = () => execution.start();
    const handlePause = () => execution.pause();
    const handleStop = () => {
        execution.stop();
        // Finalize summary metrics before completion
        runtime?.finalizeAnalytics();
        
        completeWorkout({
            startTime: execution.startTime || Date.now(),
            endTime: Date.now(),
            duration: execution.elapsedTime,
            metrics: [],
            logs: runtime?.getOutputStatements() || [],
            completed: true
        });
    };

    const handleNext = () => {
        if (runtime && execution.status !== 'completed') {
            runtime.handle(new NextEvent());
            if (execution.status !== 'running') {
                execution.start();
            }
        }
    };

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
