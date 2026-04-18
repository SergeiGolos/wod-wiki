/**
 * NoteEditor-Mobile Stories — Panels/NoteEditor/Mobile
 *
 * Uses StorybookWorkbench wrapped at 390px width to simulate a mobile
 * portrait viewport, with the same EditorShellHeader toolbar as all
 * other web editor views (Cast · Theme · Debug · Download · Reset).
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench } from '../../../_shared/StorybookWorkbench';

const meta: Meta = {
  title: 'catalog/templates/NoteEditor/Mobile',
  decorators: [
    (Story) => (
      <div style={{ width: '390px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'NoteEditor rendered at mobile (portrait) dimensions — 390px wide. ' +
          'Uses the same StorybookWorkbench shell as all other editor views.',
      },
    },
  },
};

export default meta;

// ─────────────────────────────────────────────────────────────────────────────
// Content fixtures
// ─────────────────────────────────────────────────────────────────────────────

const FRAN_CONTENT = `# Fran

**Category**: CrossFit Benchmark
**Type**: For Time
**Difficulty**: Advanced

\`\`\`wod
(21-15-9)
  Thrusters 95lb
  Pullups
\`\`\`
`;

const CINDY_CONTENT = `# Cindy

**Category**: CrossFit Benchmark
**Type**: AMRAP
**Difficulty**: Intermediate

\`\`\`wod
20:00 AMRAP
  5 Pull-ups
  10 Push-ups
  15 Air Squats
\`\`\`
`;

const WEEKLY_PLAN_CONTENT = `# Week Training Plan

## Monday — Gymnastics + Barbell

\`\`\`wod
20:00 AMRAP
  5 Pull-ups
  10 Push-ups
  15 Air Squats
\`\`\`

## Wednesday — Olympic Lifting

\`\`\`wod
10x 2:00
  3 Snatch @75%
  Rest remaining
\`\`\`

## Friday — Endurance

\`\`\`wod
5:00 Run @easy
2:00 Rest
10:00 Tempo Run @moderate
\`\`\`
`;

// ─────────────────────────────────────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────────────────────────────────────

export const Default: StoryObj = {
  name: 'Default',
  render: () => <StorybookWorkbench initialContent={FRAN_CONTENT} title="Fran" />,
};

export const DarkTheme: StoryObj = {
  name: 'Dark Theme',
  render: () => <StorybookWorkbench initialContent={FRAN_CONTENT} title="Fran" />,
};

export const Fran: StoryObj = {
  name: 'Fran (21-15-9)',
  render: () => <StorybookWorkbench initialContent={FRAN_CONTENT} title="Fran" />,
};

export const CindyAmrap: StoryObj = {
  name: 'Cindy (AMRAP 20)',
  render: () => <StorybookWorkbench initialContent={CINDY_CONTENT} title="Cindy" />,
};

export const WeeklyPlan: StoryObj = {
  name: 'Weekly Training Plan',
  render: () => <StorybookWorkbench initialContent={WEEKLY_PLAN_CONTENT} title="Weekly Plan" />,
};
