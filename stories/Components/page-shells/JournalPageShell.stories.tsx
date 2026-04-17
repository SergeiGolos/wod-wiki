/**
 * JournalPageShell Stories — Pages/Note
 *
 * Uses the real StorybookWorkbench (same shell as Syntax stories) for
 * a consistent editor experience with scrollable content and the
 * standard EditorShellHeader toolbar.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench } from '../../_shared/StorybookWorkbench';

const meta: Meta = {
  title: 'Pages/Note',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-page note editor — write and structure workouts with live parsing. Uses the same web editor shell as the Syntax reference stories.',
      },
    },
  },
};

export default meta;

const BLANK_NOTE = '';

const FRAN_NOTE = `# Fran

Classic benchmark girl WOD.

\`\`\`wod
(21-15-9)
  Thrusters 95lb
  Pullups
\`\`\`
`;

const EMOM_NOTE = `# EMOM 10

Every minute on the minute for 10 minutes.

\`\`\`wod
10:00 EMOM
  10 Kettlebell Swings 53lb
  10 Box Jumps 24"
\`\`\`
`;

const LONG_NOTE = `# Week 1 — Strength Cycle

## Monday

\`\`\`wod
Back Squat
  5 @ 65%
  5 @ 75%
  5+ @ 85%
\`\`\`

## Wednesday

\`\`\`wod
Deadlift
  5 @ 65%
  5 @ 75%
  5+ @ 85%
\`\`\`

## Friday

\`\`\`wod
Bench Press
  5 @ 65%
  5 @ 75%
  5+ @ 85%
\`\`\`

## Conditioning (daily)

\`\`\`wod
20:00 AMRAP
  400m Run
  21 Kettlebell Swings 53lb
  12 Pullups
\`\`\`
`;

export const Empty: StoryObj = {
  render: () => <StorybookWorkbench initialContent={BLANK_NOTE} title="New Note" />,
};

export const Fran: StoryObj = {
  render: () => <StorybookWorkbench initialContent={FRAN_NOTE} title="Fran" />,
};

export const Emom: StoryObj = {
  render: () => <StorybookWorkbench initialContent={EMOM_NOTE} title="EMOM 10" />,
};

export const LongNote: StoryObj = {
  render: () => (
    <StorybookWorkbench initialContent={LONG_NOTE} title="Week 1 — Strength Cycle" />
  ),
};
