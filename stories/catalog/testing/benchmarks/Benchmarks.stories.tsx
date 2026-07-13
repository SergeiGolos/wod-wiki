/**
 * Catalog / Testing / Benchmarks
 *
 * Storybook scenarios for the canonical benchmark WODs. Each story renders
 * the read-only workout editor with the run + review routes wired in, so
 * clicking Play exercises the full editor → timer → analytics workflow.
 *
 * Stories:
 *  1. Fran — 21-15-9 thrusters / pull-ups
 *  2. Murph — hero workout
 *  3. AmrapWorkout — 20:00 AMRAP
 *  4. EmptyEditor — empty benchmark note
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutEditorPage } from '../../../../playground/src/pages/WorkoutEditorPage';
import { WorkoutScenarioShell } from '../../_shared/WorkoutScenarioShell';

const FRAN_CONTENT = `# Fran

Classic benchmark "girl" WOD — 21-15-9 of thrusters and pull-ups.

\`\`\`wod
(21-15-9)
  Thrusters 95lb
  Pullups
\`\`\`
`;

const MURPH_CONTENT = `# Murph

Memorial WOD in honor of Navy Lt. Michael Murphy.

\`\`\`wod
1 Mile Run
(20x)
  5 Pullups
  10 Pushups
  15 Air Squats
1 Mile Run
\`\`\`

> Optional: wear a 20 lb vest or body armor
`;

const AMRAP_CONTENT = `# AMRAP 20

\`\`\`wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats
\`\`\`
`;

const EMPTY_CONTENT = '';

const meta: Meta<typeof WorkoutEditorPage> = {
  title: 'testing/benchmarks',
  component: WorkoutEditorPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Test scenarios for the canonical benchmark WODs (Fran, Murph, AMRAP, empty). ' +
          'Wrapped with the run + review routes so Play opens the wall-clock popup and ' +
          'completed workouts persist analytics.',
      },
    },
  },
  args: {
    category: 'benchmarks',
    name: 'Fran',
    mdContent: FRAN_CONTENT,
    theme: 'vs',
  },
  render: (args) =>
    React.createElement(WorkoutScenarioShell, { ...args, runMode: 'inline' }),
};

export default meta;

export const Fran: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Fran',
  parameters: { router: { initialEntries: ['/workout/benchmarks/fran'] } },
  args: {
    category: 'benchmarks',
    name: 'Fran',
    mdContent: FRAN_CONTENT,
  },
};

export const Murph: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Murph',
  parameters: { router: { initialEntries: ['/workout/benchmarks/murph'] } },
  args: {
    category: 'benchmarks',
    name: 'Murph',
    mdContent: MURPH_CONTENT,
  },
};

export const AmrapWorkout: StoryObj<typeof WorkoutEditorPage> = {
  name: 'AMRAP 20',
  args: {
    category: 'benchmarks',
    name: 'AMRAP 20',
    mdContent: AMRAP_CONTENT,
  },
};

export const EmptyEditor: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Empty editor',
  args: {
    category: 'benchmarks',
    name: 'New Workout',
    mdContent: EMPTY_CONTENT,
  },
};
