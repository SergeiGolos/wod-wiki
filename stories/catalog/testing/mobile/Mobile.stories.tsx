/**
 * Catalog / Testing / Mobile
 *
 * Mobile-viewport scenarios. Each story wraps the editor page in
 * {@link MobileFrame} — a centered, phone-sized container — so the page can
 * be exercised on the same canvas as the desktop stories without relying on
 * Storybook's viewport toolbar.
 *
 * Stories:
 *  1. Benchmarks — Fran
 *  2. AMRAP workout
 *  3. Syntax — Classic AMRAP
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { WorkoutEditorPage } from '../../../../playground/src/pages/WorkoutEditorPage';
import { WorkoutScenarioShell } from '../../_shared/WorkoutScenarioShell';
import { MobileFrame } from '../../_shared/MobileFrame';

const FRAN_CONTENT = `# Fran

Classic benchmark "girl" WOD — 21-15-9 of thrusters and pull-ups.

\`\`\`wod
(21-15-9)
  Thrusters 95lb
  Pullups
\`\`\`
`;

const AMRAP_CONTENT = `# AMRAP 20

\`\`\`wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats
\`\`\`
`;

const SYNTAX_AMRAP = `\`\`\`wod
20:00 AMRAP
  5 Pullups
  10 Pushups
  15 Air Squats
\`\`\`
`;

const meta: Meta<typeof WorkoutEditorPage> = {
  title: 'testing/mobile',
  component: WorkoutEditorPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Mobile-viewport scenarios. The page is rendered inside a centered, ' +
          'phone-sized frame so the editor, runtime, and analytics surfaces ' +
          'can be exercised as they appear on a real device.',
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
    React.createElement(
      MobileFrame,
      null,
      React.createElement(WorkoutScenarioShell, { ...args, runMode: 'inline' }),
    ),
};

export default meta;

export const BenchmarksFran: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Benchmarks — Fran',
  args: {
    category: 'benchmarks',
    name: 'Fran',
    mdContent: FRAN_CONTENT,
  },
};

export const BenchmarksAmrap: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Benchmarks — AMRAP 20',
  args: {
    category: 'benchmarks',
    name: 'AMRAP 20',
    mdContent: AMRAP_CONTENT,
  },
};

export const SyntaxAmrap: StoryObj<typeof WorkoutEditorPage> = {
  name: 'Syntax — Classic AMRAP',
  args: {
    category: 'syntax',
    name: 'Classic AMRAP',
    mdContent: SYNTAX_AMRAP,
  },
};
