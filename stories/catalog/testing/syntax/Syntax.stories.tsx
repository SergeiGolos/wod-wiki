/**
 * Catalog / Testing / Syntax
 *
 * Step-through scenarios for the Whiteboard Language syntax. Each story loads
 * a single curated example so the editor → runtime surface can be exercised
 * one concept at a time: single movement, rounds, rep schemes, EMOM, AMRAP,
 * Tabata, full session, and the `wod` dialect.
 *
 * Markdown sources live under `markdown/canvas/syntax/` (kept in sync with the
 * `/guide/syntax/*` reference pages).
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutEditorPage } from '../../../../playground/src/pages/WorkoutEditorPage';
import { WorkoutScenarioShell } from '../../_shared/WorkoutScenarioShell';

const singleMovement = `\`\`\`wod
Pushups
\`\`\`
`;

const simpleRounds = `\`\`\`wod
(3 Rounds)
  10 Pushups
  15 Situps
  20 Air Squats
\`\`\`
`;

const repSequence = `\`\`\`wod
(21-15-9)
  Thrusters 95lb
  Pullups
\`\`\`
`;

const basicEmom = `\`\`\`wod
(10) :60 EMOM
  3 Clean & Jerk 135lb
\`\`\`
`;

const classicAmrap = `\`\`\`wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats
\`\`\`
`;

const tabata = `\`\`\`wod
(8 Rounds)
  :20 Max Effort Burpees
  :10 Rest
\`\`\`
`;

const fullSession = `# Thursday Session

\`\`\`wod
// Warmup
  400m Run
  10 Air Squats

// Strength
  (5 Sets)
    3 Back Squat 225lb
    *2:00 Rest

// Conditioning
  10:00 AMRAP
    5 Pullups
    10 Pushups

// Cool-down
  5:00 Walk
\`\`\`
`;

const dialectWod = `\`\`\`wod
(3 Rounds)
  10 Pushups
  15 Air Squats
  :30 Rest

5:00 Run hard
\`\`\`
`;

const meta: Meta<typeof WorkoutEditorPage> = {
  title: 'testing/syntax',
  component: WorkoutEditorPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Step-through syntax examples. Each story loads a curated wod block ' +
          'so the editor, runtime, and analytics surface can be exercised one ' +
          'concept at a time.',
      },
    },
  },
  args: {
    category: 'syntax',
    name: 'Syntax',
    mdContent: singleMovement,
    theme: 'vs',
  },
  render: (args) =>
    React.createElement(WorkoutScenarioShell, { ...args, runMode: 'inline' }),
};

export default meta;

export const SingleMovement: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Single movement',
  args: { category: 'syntax', name: 'Single movement', mdContent: singleMovement },
};

export const SimpleRounds: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Simple rounds (3x)',
  args: { category: 'syntax', name: 'Simple rounds', mdContent: simpleRounds },
};

export const RepSequence: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Rep sequence (21-15-9)',
  args: { category: 'syntax', name: 'Rep sequence', mdContent: repSequence },
};

export const BasicEmom: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Basic EMOM',
  args: { category: 'syntax', name: 'Basic EMOM', mdContent: basicEmom },
};

export const ClassicAmrap: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Classic AMRAP',
  args: { category: 'syntax', name: 'Classic AMRAP', mdContent: classicAmrap },
};

export const Tabata: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Tabata (8x :20/:10)',
  args: { category: 'syntax', name: 'Tabata', mdContent: tabata },
};

export const FullSession: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Full training session',
  args: { category: 'syntax', name: 'Full session', mdContent: fullSession },
};

export const DialectWod: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Dialect: wod',
  args: { category: 'syntax', name: 'Dialect: wod', mdContent: dialectWod },
};
