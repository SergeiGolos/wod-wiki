/**
 * WorkoutEditorPage Stories
 *
 * The WorkoutEditorPage renders workout content in the note editor with
 * collection-mode WOD commands (Run, Today, Plan). Stories use static
 * markdown content passed via the `mdContent` prop.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutEditorPage } from '../../../playground/src/pages/WorkoutEditorPage';

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
  title: 'catalog/pages/WorkoutEditorPage',
  component: WorkoutEditorPage,
  parameters: {
    layout: 'fullscreen',
    router: { initialEntries: ['/workout/benchmarks/fran'] },
    docs: {
      description: {
        component:
          'Full-page workout editor — view and run a workout from the collections library. ' +
          'Shows the editor with Run / Today / Plan commands on each WOD block.',
      },
    },
  },
  args: {
    category: 'benchmarks',
    name: 'Fran',
    mdContent: FRAN_CONTENT,
    theme: 'vs',
  },
};

export default meta;

export const Fran: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Benchmark — Fran',
  args: {
    category: 'benchmarks',
    name: 'Fran',
    mdContent: FRAN_CONTENT,
  },
};

export const Murph: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Benchmark — Murph',
  args: {
    category: 'benchmarks',
    name: 'Murph',
    mdContent: MURPH_CONTENT,
  },
  parameters: {
    router: { initialEntries: ['/workout/benchmarks/murph'] },
  },
};

export const AmrapWorkout: StoryObj<typeof WorkoutEditorPage> = {
  name: 'AMRAP workout',
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

export const SyntaxMode: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Syntax page (inline runtime)',
  args: {
    category: 'syntax',
    name: 'Syntax Guide',
    mdContent: `# WOD Wiki Syntax Guide

## Basic Statement

\`\`\`wod
10:00
  Run
\`\`\`

## Groups

\`\`\`wod
(3x)
  10 Air Squats
\`\`\`
`,
  },
};

export const Mobile: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Mobile viewport',
  args: {
    category: 'benchmarks',
    name: 'Fran',
    mdContent: FRAN_CONTENT,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};
