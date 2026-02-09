import { useCallback, useEffect } from 'react';
import { useRuntimeLifecycle } from '../layout/RuntimeProvider';
import { useWorkoutEvents } from '../../hooks/useWorkoutEvents';
import { useRuntimeExecution } from '../../runtime-test-bench/hooks/useRuntimeExecution';
import { WorkoutEvent } from '../../services/WorkoutEventBus';
import type { WorkoutResults, WodBlock } from '../../markdown-editor/types';
import { NextEvent } from '../../runtime/events/NextEvent';
import { audioService } from '../../services/AudioService';
import { IEventHandler } from '../../runtime/contracts/events/IEventHandler';
import { IEvent } from '../../runtime/contracts/events/IEvent';
import { IScriptRuntime } from '../../runtime/contracts/IScriptRuntime';
import { RegisterEventHandlerAction } from '../../runtime/actions/events/RegisterEventHandlerAction';
import { UnregisterEventHandlerAction } from '../../runtime/actions/events/UnregisterEventHandlerAction';

/**
 * Hook to encapsulate UnifiedWorkbench runtime logic.
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

            // Cleanup on unmount or runtime change
            return () => {
                const unregisterAction = new UnregisterEventHandlerAction('global-audio-handler');
                unregisterAction.do(runtime);
            };
        }
    }, [runtime]);

    // Initialize runtime when entering track view with selected block
    // Note: Consumer needs to use useEffect to call initializeRuntime/disposeRuntime based on viewMode/selectedBlock
    // This hook just provides the callbacks and state

    const handleStart = () => execution.start();
    const handlePause = () => execution.pause();
    const handleStop = () => {
        execution.stop();
        completeWorkout({
            startTime: execution.startTime || Date.now(),
            endTime: Date.now(),
            duration: execution.elapsedTime,
            metrics: [],
            completed: true
        });
    };

    const handleNext = () => {
        if (runtime) {
            runtime.handle(new NextEvent());
            if (execution.status !== 'running') {
                execution.step();
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
                        execution.step();
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
