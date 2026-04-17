/**
 * NoteEditor Stories — Panels/NoteEditor/Web
 *
 * All stories use StorybookWorkbench for a consistent full-screen editor
 * shell with EditorShellHeader (Cast · Theme · Debug · Download · Reset).
 * The editor is scrollable and fills the viewport height.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench } from '../_shared/StorybookWorkbench';

const meta: Meta = {
  title: 'Panels/NoteEditor/Web',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Unified NoteEditor stories using the standard web editor shell. ' +
          'All stories share the same header toolbar (Cast · Theme · Debug · Download · Reset) ' +
          'and support scrolling.',
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

## Description
One of the most famous CrossFit benchmark workouts. Fran is a sprint that tests
both metabolic conditioning and strength endurance.

\`\`\`wod
(21-15-9)
  Thrusters 95lb
  Pullups
\`\`\`

## Target Times
- **Elite**: Under 2 minutes
- **Advanced**: 2–4 minutes
- **Intermediate**: 4–6 minutes
- **Beginner**: 6+ minutes

## Tips
- Break thrusters early to avoid failure
- Use kipping pullups if allowed
- Focus on fast transitions between exercises

## Scaling Options
- **Beginner**: Reduce weight to 65 lb, use band-assisted pullups
- **Intermediate**: 75 lb, strict pullups
- **Advanced**: Rx as written
`;

const HELEN_CONTENT = `# Helen

**Category**: CrossFit Benchmark
**Type**: For Time
**Difficulty**: Intermediate

## Description
Helen combines cardio with conditioning work, testing both endurance and strength.

\`\`\`wod
(3)
  400m Run
  21 KB Swings 53lb
  12 Pullups
\`\`\`

## Target Times
- **Elite**: Under 8 minutes
- **Advanced**: 8–12 minutes
- **Intermediate**: 12–15 minutes
- **Beginner**: 15+ minutes
`;

const SIMPLE_AND_SINISTER_CONTENT = `# Simple & Sinister (S\\&S)

**Category**: StrongFirst | **Type**: Timed Sets | **Difficulty**: Beginner–Advanced

## Description
Pavel Tsatsouline's minimalist kettlebell program — 100 one-arm swings and
10 Turkish Get-Ups, 5–6 days per week.

---

## Session 1: The Daily S\\&S Session

\`\`\`wod
5:00 100 KB Swings ?kg
  - (10)
    10 KB Swings ?kg

10:00 10 Turkish Getups ?kg
  - 5 Turkish Getups Left ?kg
  - 5 Turkish Getups Right ?kg
\`\`\`

---

## Session 2: Swing Ladders (Volume Building)

For beginners building up to 100 swings.

\`\`\`wod
(5)
  (10)
    KB Swings ?kg
  1:00 Rest
\`\`\`

## Progression
| Standard | Swings Time | TGU Time | Men   | Women |
|----------|:-----------:|:--------:|:-----:|:-----:|
| Simple   | 5:00        | 10:00    | 32 kg | 16 kg |
| Sinister | 5:00        | 10:00    | 48 kg | 24 kg |
`;

const ARMOR_BUILDING_CONTENT = `# Armor Building Complex (ABC)

**Category**: Dan John Complex
**Type**: Strength Complex
**Difficulty**: Intermediate–Advanced

## Description
Dan John's signature double kettlebell complex.

\`\`\`wod
(5)
  2 Double Clean 24kg
  1 Double Press 24kg
  3 Double Front Squat 24kg
  1:00 Rest
\`\`\`

## Progression Table

| Level        | Weight (Men) | Weight (Women) |
|--------------|:------------:|:--------------:|
| Beginner     | 16 kg        | 8 kg           |
| Intermediate | 24 kg        | 16 kg          |
| Advanced     | 32 kg        | 24 kg          |
`;

const CINDY_CONTENT = `# Cindy

**Category**: CrossFit Benchmark
**Type**: AMRAP
**Difficulty**: Intermediate

## Description
Cindy tests aerobic capacity and bodyweight strength across 20 minutes.

\`\`\`wod
20:00 AMRAP
  5 Pull-ups
  10 Push-ups
  15 Air Squats
\`\`\`

## Scoring
Count total rounds + remaining reps.

- **Elite**: 30+ rounds
- **Advanced**: 20–29 rounds
- **Intermediate**: 12–19 rounds
- **Beginner**: Under 12 rounds
`;

const WEEKLY_PLAN_CONTENT = `# Week of March 11 — Training Plan

A mixed conditioning week combining gymnastics, strength, and cardio.

---

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
3:00 Cool-down Walk
\`\`\`

## Notes
> Focus on technique this week. Weight is secondary to movement quality.
`;

const EMPTY_CONTENT = '';

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

export const EmptyDocument: StoryObj = {
  name: 'Empty Plan',
  render: () => <StorybookWorkbench initialContent={EMPTY_CONTENT} title="New Note" />,
};

export const Fran: StoryObj = {
  name: 'Fran (21-15-9)',
  render: () => <StorybookWorkbench initialContent={FRAN_CONTENT} title="Fran" />,
};

export const Helen: StoryObj = {
  name: 'Helen (3 Rounds)',
  render: () => <StorybookWorkbench initialContent={HELEN_CONTENT} title="Helen" />,
};

export const SimpleAndSinister: StoryObj = {
  name: 'Simple & Sinister (Kettlebell)',
  render: () => (
    <StorybookWorkbench initialContent={SIMPLE_AND_SINISTER_CONTENT} title="Simple & Sinister" />
  ),
};

export const ArmorBuildingComplex: StoryObj = {
  name: 'Dan John: Armor Building Complex',
  render: () => (
    <StorybookWorkbench initialContent={ARMOR_BUILDING_CONTENT} title="Armor Building Complex" />
  ),
};

export const CindyAmrap: StoryObj = {
  name: 'Cindy (AMRAP 20)',
  render: () => <StorybookWorkbench initialContent={CINDY_CONTENT} title="Cindy" />,
};

export const WeeklyPlan: StoryObj = {
  name: 'Weekly Training Plan',
  render: () => (
    <StorybookWorkbench initialContent={WEEKLY_PLAN_CONTENT} title="Week of March 11" />
  ),
};
