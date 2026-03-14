/**
 * PlanView Stories
 *
 * Showcases the full `PlanPanel` component — the Plan view in the Workbench —
 * with realistic workout content sourced from the wod/ library.
 *
 * The Plan view is a Monaco-powered section editor. Unlike the SectionTypes
 * stories which focus on individual section renderers, these stories show the
 * complete editing experience:
 *  - "Start Workout" button on WOD blocks
 *  - Read-only preview mode (as seen from History/Preview)
 *  - Long multi-block plans with mixed markdown + wod sections
 *
 * States:
 *  1. EmptyPlan       — blank slate, cursor blinking
 *  2. Fran            — classic 21-15-9 CrossFit benchmark
 *  3. SimpleAndSinister — double-kettlebell plan with multiple sessions
 *  4. WeeklyPlan      — multi-day markdown + wod hybrid
 *  5. CindyAmrap      — 20-min AMRAP with notes
 *  6. ReadOnly        — same as Fran but read-only (preview mode)
 */

import React, { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { PanelSizeProvider } from '@/panels/panel-system/PanelSizeContext';
import { PlanPanel } from '@/panels/plan-panel';
import type { WodBlock } from '@/components/Editor/types';

// ─────────────────────────────────────────────────────────────────────────────
// Workout content fixtures (sourced from wod/ collection)
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

const SIMPLE_AND_SINISTER_CONTENT = `# Simple & Sinister (S\&S)

**Category**: StrongFirst | **Type**: Timed Sets | **Difficulty**: Beginner–Advanced

## Description
Pavel Tsatsouline's minimalist kettlebell program — 100 one-arm swings and
10 Turkish Get-Ups, 5–6 days per week.

---

## Session 1: The Daily S\&S Session

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

const WEEKLY_PLAN_CONTENT = `# Week of March 11 — Training Plan

A mixed conditioning week combining gymnastics, strength, and cardio.

---

## Monday — Gymnastics + Barbell

\`\`\`wod
10:00 Warm-up
  2:00 Jump Rope
  3x {
    10 Shoulder Circles
    10 Hip Circles
    10 Leg Swings
  }

5:00 AMRAP Skills
  5 Kipping Swings
  3 Chest-to-Bar Practice

20:00 AMRAP
  5 Pull-ups
  10 Push-ups
  15 Air Squats
\`\`\`

## Wednesday — Olympic Lifting

\`\`\`wod
20:00 Snatch Work
  3x 3 Hang Power Snatch @60%
  3x 2 Snatch @70%
  2x 1 Snatch @80%

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
> Eat well, sleep 8+ hours, and stay hydrated.
`;

const CINDY_CONTENT = `# Cindy

**Category**: CrossFit Benchmark
**Type**: AMRAP
**Difficulty**: Intermediate

## Description
Cindy tests aerobic capacity and bodyweight strength across 20 minutes.
Simple movements, brutal volume.

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

## Strategy
- Maintain a steady pace — no sprinting at the start
- Break pull-ups as needed (3+2 rather than failing at 5)
- Air squats are your rest — use them to recover
`;

const ARMOR_BUILDING_CONTENT = `# Armor Building Complex (ABC)

**Category**: Dan John Complex
**Type**: Strength Complex
**Difficulty**: Intermediate–Advanced

## Description
Dan John's signature double kettlebell complex — 2 cleans, 1 press, 3 front squats
performed without setting the bells down.

\`\`\`wod
(5)
  2 Double Clean 24kg
  1 Double Press 24kg
  3 Double Front Squat 24kg
  1:00 Rest
\`\`\`

## Progression Table

| Level       | Weight (Men) | Weight (Women) |
|-------------|:------------:|:--------------:|
| Beginner    | 16 kg        | 8 kg           |
| Intermediate| 24 kg        | 16 kg          |
| Advanced    | 32 kg        | 24 kg          |

## Notes
Do not set the kettlebells down between movements in a single round.
`;

// ─────────────────────────────────────────────────────────────────────────────
// PlanViewHarness — wraps PlanPanel with required providers + state management
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanViewHarnessProps {
  /** Initial workout content */
  initialContent: string;
  /** Open in read-only (preview) mode */
  readOnly?: boolean;
  /** Canvas height */
  height?: string;
  /** Called when "Start Workout" is pressed on a WOD block */
  onStartWorkout?: (block: WodBlock) => void;
}

const PlanViewHarness: React.FC<PlanViewHarnessProps> = ({
  initialContent,
  readOnly = false,
  height = '700px',
  onStartWorkout,
}) => {
  const [, setBlocks] = useState<unknown[]>([]);
  const [, setContent] = useState(initialContent);

  const handleStartWorkout = useCallback(
    (block: WodBlock) => {
      onStartWorkout?.(block);
    },
    [onStartWorkout],
  );

  return (
    <PanelSizeProvider>
      <div
        className="border rounded-lg overflow-hidden bg-background"
        style={{ height }}
      >
        <PlanPanel
          initialContent={initialContent}
          onStartWorkout={handleStartWorkout}
          setBlocks={setBlocks}
          setContent={setContent}
          readOnly={readOnly}
        />
      </div>
    </PanelSizeProvider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta: Meta<typeof PlanViewHarness> = {
  title: 'Components/Planner/PlanView',
  component: PlanViewHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The full `PlanPanel` editor — the Plan view in the Workbench. ' +
          'Content is pre-loaded from the wod/ library. Click the ▶ button on ' +
          'any WOD block to fire the `onStartWorkout` action.',
      },
    },
  },
  argTypes: {
    initialContent: {
      control: 'text',
      description: 'Workout markdown/wod content',
    },
    readOnly: {
      control: 'boolean',
      description: 'Open in read-only preview mode (no editing, shows Start button)',
    },
    height: {
      control: 'text',
      description: 'CSS height of the story canvas',
    },
  },
  args: {
    onStartWorkout: fn().mockName('onStartWorkout'),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─────────────────────────────────────────────────────────────────────────────
// Stories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Blank plan — the state a new user sees when no content is loaded yet.
 */
export const EmptyPlan: Story = {
  name: 'Empty Plan',
  args: {
    initialContent: '',
    readOnly: false,
    height: '500px',
  },
};

/**
 * Fran — canonical CrossFit benchmark in the editor.
 * Note the "Start Workout" button on the WOD block.
 */
export const Fran: Story = {
  name: 'Fran (21-15-9)',
  args: {
    initialContent: FRAN_CONTENT,
    readOnly: false,
    height: '700px',
  },
};

/**
 * Helen — 3-round benchmark with run/swings/pullups.
 */
export const Helen: Story = {
  name: 'Helen (3 Rounds)',
  args: {
    initialContent: HELEN_CONTENT,
    readOnly: false,
    height: '580px',
  },
};

/**
 * Simple & Sinister — multi-session kettlebell plan with progress table.
 */
export const SimpleAndSinister: Story = {
  name: 'Simple & Sinister (Kettlebell)',
  args: {
    initialContent: SIMPLE_AND_SINISTER_CONTENT,
    readOnly: false,
    height: '750px',
  },
};

/**
 * Armor Building Complex — double-KB complex from Dan John.
 */
export const ArmorBuildingComplex: Story = {
  name: 'Dan John: Armor Building Complex',
  args: {
    initialContent: ARMOR_BUILDING_CONTENT,
    readOnly: false,
    height: '650px',
  },
};

/**
 * Cindy AMRAP — 20-min AMRAP plan with notes.
 */
export const CindyAmrap: Story = {
  name: 'Cindy (AMRAP 20)',
  args: {
    initialContent: CINDY_CONTENT,
    readOnly: false,
    height: '700px',
  },
};

/**
 * Weekly plan — a multi-day markdown + WOD hybrid document.
 * Shows how the editor handles mixed content with multiple WOD blocks.
 */
export const WeeklyPlan: Story = {
  name: 'Weekly Training Plan',
  args: {
    initialContent: WEEKLY_PLAN_CONTENT,
    readOnly: false,
    height: '800px',
  },
};

/**
 * Read-only mode — the same as Fran but displayed as a preview.
 * This is the mode used when viewing a template from the Collections page.
 */
export const ReadOnly: Story = {
  name: 'Read-Only Preview (Fran)',
  args: {
    initialContent: FRAN_CONTENT,
    readOnly: true,
    height: '700px',
  },
};
