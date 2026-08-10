import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { WorkoutEditorPage } from '../../../playground/src/pages/WorkoutEditorPage';
import type { WorkoutEditorPageProps } from '../../../playground/src/pages/WorkoutEditorPage';
import { WallClockPage } from '../../../playground/src/pages/WallClockPage';

/**
 * Storybook harness for the editor → timer → analytics workflow.
 *
 * Wraps the read-only collection workout editor with the same `/run` route
 * the real app uses, so clicking Run opens the wall-clock popup; completion
 * routes to the explorer (#946 retired the dedicated review page).
 *
 * This is a storybook-only shell; production routing lives in `App.tsx`.
 */
export interface WorkoutScenarioShellProps extends WorkoutEditorPageProps {
  /**
   * Where the Run command should launch the workout.
   * Default: 'inline' opens the wall-clock popup in-place.
   */
  runMode?: 'inline' | 'journal';
}

export const WorkoutScenarioShell: React.FC<WorkoutScenarioShellProps> = ({
  runMode = 'inline',
  hidePlanningCommands = true,
  ...editorProps
}) => {
  return (
    <Routes>
      <Route path="/run/:runtimeId" element={<WallClockPage />} />
      <Route
        path="*"
        element={
          <WorkoutEditorPage
            {...editorProps}
            runMode={runMode}
            hidePlanningCommands={hidePlanningCommands}
          />
        }
      />
    </Routes>
  );
};
