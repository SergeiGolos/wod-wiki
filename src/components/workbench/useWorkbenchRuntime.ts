import { useCallback } from 'react';
import { useRuntime } from '../layout/RuntimeProvider';
import { useWorkoutEvents } from '../../hooks/useWorkoutEvents';
import { useRuntimeExecution } from '../../runtime-test-bench/hooks/useRuntimeExecution';
import { WorkoutEvent } from '../../services/WorkoutEventBus';
import { WodBlock } from '../../markdown-editor/types';
import { NextEvent } from '../../runtime/NextEvent';

/**
 * Hook to encapsulate UnifiedWorkbench runtime logic.
 */
export const useWorkbenchRuntime = (
  viewMode: string,
  selectedBlock: any | null,
  completeWorkout: (results: any) => void,
  startWorkout: (block: any) => void
) => {
  const { runtime, initializeRuntime, disposeRuntime } = useRuntime();
  const execution = useRuntimeExecution(runtime);

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
      execution.step();
    }
  };

  const handleStartWorkoutAction = useCallback((block: WodBlock) => {
    console.log('[useWorkbenchRuntime] handleStartWorkoutAction called for block:', block.id);
    startWorkout(block);
  }, [startWorkout]);

  const handleWorkoutEvent = useCallback((event: WorkoutEvent) => {
    console.log('[useWorkbenchRuntime] Received workout event:', event.type);
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
          execution.step();
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
