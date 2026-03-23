/**
 * UnifiedEditor Stories
 *
 * Mirrors the full set of stories from the planner view (PlanView + SectionTypes)
 * so both editors can be compared side-by-side.
 *
 * Story groups:
 *   1. Editor Config   — theme, preview, linting, overlay toggles
 *   2. Plan View       — full workout plans (Fran, Helen, S&S, ABC, Cindy, Weekly)
 *   3. Section Types   — each content section in isolation (Markdown, WOD, FrontMatter)
 */

import type { Meta, StoryObj } from "@storybook/react";
import { UnifiedEditor } from "@/components/Editor/UnifiedEditor";
import { CommandProvider } from "@/components/command-palette/CommandContext";
import { fn } from "storybook/test";
import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Content fixtures  (identical to PlanView.stories.tsx + SectionTypes.stories.tsx)
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

| Level        | Weight (Men) | Weight (Women) |
|--------------|:------------:|:--------------:|
| Beginner     | 16 kg        | 8 kg           |
| Intermediate | 24 kg        | 16 kg          |
| Advanced     | 32 kg        | 24 kg          |

## Notes
Do not set the kettlebells down between movements in a single round.
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

// ─────────────────────────────────────────────────────────────────────────────
// Wrapper
// ─────────────────────────────────────────────────────────────────────────────

function UnifiedEditorWrapper(props: {
  initialContent?: string;
  theme?: string;
  readonly?: boolean;
  enablePreview?: boolean;
  enableLinting?: boolean;
  enableOverlay?: boolean;
  showLineNumbers?: boolean;
  height?: string;
  onStartWorkout?: (block: unknown) => void;
}) {
  const [content, setContent] = useState(props.initialContent ?? FRAN_CONTENT);

  return (
    <CommandProvider>
      <div className="p-4 h-full w-full flex flex-col box-border">
        <div
          className="border rounded-lg overflow-hidden w-full flex-1 min-h-0"
        >
        <UnifiedEditor
          value={content}
          onChange={setContent}
          theme={props.theme}
          readonly={props.readonly}
          enablePreview={props.enablePreview}
          enableLinting={props.enableLinting}
          enableOverlay={props.enableOverlay}
          showLineNumbers={props.showLineNumbers}
          onStartWorkout={(block) => props.onStartWorkout?.(block)}
          onBlocksChange={(blocks) => console.log("Blocks changed:", blocks.length)}
        />
        </div>
      </div>
    </CommandProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta: Meta<typeof UnifiedEditorWrapper> = {
  title: "Panels/UnifiedEditor/Web",
  component: UnifiedEditorWrapper,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Unified single-instance CodeMirror 6 editor. Stories mirror the " +
          "PlanView and SectionTypes stories so both editors can be compared " +
          "side-by-side.",
      },
    },
  },
  argTypes: {
    theme: {
      control: "select",
      options: ["vs", "dark"],
      description: "Editor theme",
    },
    readonly: {
      control: "boolean",
      description: "Read-only mode",
    },
    enablePreview: {
      control: "boolean",
      description: "Enable block-level live preview",
    },
    enableLinting: {
      control: "boolean",
      description: "Enable WodScript syntax linting",
    },
    enableOverlay: {
      control: "boolean",
      description: "Enable interactive overlay panel",
    },
    showLineNumbers: {
      control: "boolean",
      description: "Show line numbers",
    },
    height: {
      control: "text",
      description: "CSS height of the editor canvas",
    },
  },
  args: {
    onStartWorkout: fn().mockName("onStartWorkout"),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Editor Config stories
// ─────────────────────────────────────────────────────────────────────────────

export const Default: Story = {
  name: "Default",
  args: {
    initialContent: FRAN_CONTENT,
    theme: "vs",
    readonly: false,
    enablePreview: true,
    enableLinting: true,
    enableOverlay: false,
    showLineNumbers: true,
    height: "700px",
  },
};

export const DarkTheme: Story = {
  name: "Dark Theme",
  args: {
    ...Default.args,
    theme: "dark",
  },
};

export const NoPreview: Story = {
  name: "Without Preview",
  args: {
    ...Default.args,
    enablePreview: false,
  },
};

export const ReadOnly: Story = {
  name: "Read-Only Preview (Fran)",
  args: {
    ...Default.args,
    readonly: true,
  },
};

export const EmptyDocument: Story = {
  name: "Empty Plan",
  args: {
    ...Default.args,
    initialContent: "",
    height: "500px",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Plan View stories  (mirrors PlanView.stories.tsx)
// ─────────────────────────────────────────────────────────────────────────────

export const Fran: Story = {
  name: "Fran (21-15-9)",
  args: {
    ...Default.args,
    initialContent: FRAN_CONTENT,
    height: "700px",
  },
};

export const Helen: Story = {
  name: "Helen (3 Rounds)",
  args: {
    ...Default.args,
    initialContent: HELEN_CONTENT,
    height: "580px",
  },
};

export const SimpleAndSinister: Story = {
  name: "Simple & Sinister (Kettlebell)",
  args: {
    ...Default.args,
    initialContent: SIMPLE_AND_SINISTER_CONTENT,
    height: "750px",
  },
};

export const ArmorBuildingComplex: Story = {
  name: "Dan John: Armor Building Complex",
  args: {
    ...Default.args,
    initialContent: ARMOR_BUILDING_CONTENT,
    height: "650px",
  },
};

export const CindyAmrap: Story = {
  name: "Cindy (AMRAP 20)",
  args: {
    ...Default.args,
    initialContent: CINDY_CONTENT,
    height: "700px",
  },
};

export const WeeklyPlan: Story = {
  name: "Weekly Training Plan",
  args: {
    ...Default.args,
    initialContent: WEEKLY_PLAN_CONTENT,
    height: "800px",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Section Type stories  (mirrors SectionTypes.stories.tsx)
// ─────────────────────────────────────────────────────────────────────────────

export const TitleSection: Story = {
  name: "Section — Title",
  args: {
    ...Default.args,
    height: "300px",
    initialContent: `# Morning Workout
## Warm-up Routine

A simple title section — the first text block becomes the title.`,
  },
};

export const MarkdownSection: Story = {
  name: "Section — Markdown",
  args: {
    ...Default.args,
    height: "500px",
    initialContent: `# Notes

## Instructions
Follow these steps carefully:

### Warm-up Phase
Start with **5 minutes** of light jogging.
Then perform *dynamic stretches* for all major muscle groups.

### Main Set
- 3 rounds of:
  - 10 push-ups
  - 15 squats
  - 20 lunges

### Cool-down
Walk for 5 minutes and stretch.`,
  },
};

export const MarkdownTable: Story = {
  name: "Section — Markdown Table",
  args: {
    ...Default.args,
    height: "420px",
    initialContent: `# Weekly Schedule

| Day       | Focus        | Duration | Intensity |
|-----------|:------------:|:--------:| ---------:|
| Monday    | Upper Body   | 45 min   | High      |
| Tuesday   | Cardio       | 30 min   | Moderate  |
| Wednesday | Lower Body   | 50 min   | High      |
| Thursday  | Rest         | —        | —         |
| Friday    | Full Body    | 60 min   | High      |
| Saturday  | Active Rest  | 30 min   | Low       |
| Sunday    | Rest         | —        | —         |

Notes below the table continue as normal markdown.`,
  },
};

export const WodBlock: Story = {
  name: "Section — WOD Block",
  args: {
    ...Default.args,
    height: "380px",
    initialContent: `# AMRAP 20

\`\`\`wod
5:00 Run
2:00 Rest
3x {
  10 Push-ups
  15 Squats
  20 Sit-ups
}
\`\`\`

Good luck!`,
  },
};

export const LogBlock: Story = {
  name: "Section — Log Block",
  args: {
    ...Default.args,
    height: "360px",
    initialContent: `# Training Log — Jan 15

\`\`\`log
5:00 Run @easy
2:00 Rest
10:00 Tempo Run @moderate
3:00 Cool-down Walk
\`\`\`

Felt strong today. HR stayed in zone 2 for tempo section.`,
  },
};

export const FrontMatterDefault: Story = {
  name: "Front Matter — Default",
  args: {
    ...Default.args,
    height: "500px",
    initialContent: `---
title: CrossFit Open 24.1
coach: Jane Smith
difficulty: Advanced
equipment: Barbell, Pull-up bar, Jump rope
category: Competition
scoring: For Time
time_cap: 15:00
---

# CrossFit Open 24.1

\`\`\`wod
3x {
  10 Thrusters
  15 Bar-facing Burpees
  20 Double-unders
}
\`\`\``,
  },
};

export const FrontMatterYouTube: Story = {
  name: "Front Matter — YouTube",
  args: {
    ...Default.args,
    height: "620px",
    initialContent: `---
type: youtube
url: https://www.youtube.com/watch?v=dQw4w9WgXcQ
title: Movement Standards Demo
---

# Workout Briefing

Watch the video above for movement standards before starting.

\`\`\`wod
5:00 Run
3x {
  15 Wall Balls
  10 Box Jumps
}
\`\`\``,
  },
};

export const FrontMatterYouTubeAutoDetect: Story = {
  name: "Front Matter — YouTube (Auto-detect)",
  args: {
    ...Default.args,
    height: "380px",
    initialContent: `---
url: https://youtu.be/dQw4w9WgXcQ
---

# Quick Video Reference

The YouTube embed is auto-detected from the URL pattern.`,
  },
};

export const FrontMatterStrava: Story = {
  name: "Front Matter — Strava",
  args: {
    ...Default.args,
    height: "460px",
    initialContent: `---
type: strava
url: https://www.strava.com/activities/12345678
title: Morning 5K Run
distance: 5.2km
time: 25:30
pace: 4:54/km
elevation: 120m
description: Easy recovery run around the park
---

# Recovery Session

Light run to promote active recovery after yesterday's heavy lifting.`,
  },
};

export const FrontMatterStravaAutoDetect: Story = {
  name: "Front Matter — Strava (Auto-detect)",
  args: {
    ...Default.args,
    height: "400px",
    initialContent: `---
url: https://www.strava.com/activities/98765432
title: Hill Repeats
distance: 8km
time: 42:15
elevation: 340m
---

# Hill Training

Strava link auto-detected from URL.`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Inline Metric Feedback stories
// ─────────────────────────────────────────────────────────────────────────────

const METRIC_FEEDBACK_CONTENT = `# Inline Metric Feedback Demo

Hover over any line inside a WOD block to see the **metric hover tooltip**.
Click inside a WOD block to move the cursor — the **metric inline panel**
appears below the active line with colored underlines on each metric token.

\`\`\`wod
5:00 Run
(3)
  21 Thrusters 95lb
  15 Box Jumps 24inch
  9 Bar Muscle-ups
\`\`\`

Mix of timer, reps, resistance, and distance:

\`\`\`wod
10:00 AMRAP
  400m Run
  21 KB Swings 53lb
  12 Pull-ups
\`\`\`

Rounds-based work:

\`\`\`wod
(5)
  1:00 Row
  30 Double-unders
  15 Toes-to-bar
\`\`\`
`;

export const InlineMetricFeedback: Story = {
  name: "Inline Metric Feedback",
  args: {
    initialContent: METRIC_FEEDBACK_CONTENT,
    theme: "vs",
    enablePreview: true,
    enableLinting: true,
    enableOverlay: false,
    showLineNumbers: true,
    height: "600px",
  },
};

export const InlineMetricFeedbackDark: Story = {
  name: "Inline Metric Feedback — Dark",
  args: {
    ...InlineMetricFeedback.args,
    theme: "dark",
  },
};

export const FrontMatterFileImage: Story = {
  name: "Front Matter — File (Image)",
  args: {
    ...Default.args,
    height: "420px",
    initialContent: `---
type: file
file: https://picsum.photos/800/400
title: Workout Location
caption: Today's outdoor training spot
---

# Outdoor Session

Training in the park today. See photo above for the location.`,
  },
};

export const FrontMatterFileDocument: Story = {
  name: "Front Matter — File (Document)",
  args: {
    ...Default.args,
    height: "380px",
    initialContent: `---
type: file
file: /data/training-plan-q1.pdf
title: Q1 Training Plan
caption: Periodization plan for January–March
---

# Quarterly Plan

Refer to the attached document for the full periodization schedule.`,
  },
};

export const FrontMatterAmazon: Story = {
  name: "Front Matter — Amazon",
  args: {
    ...Default.args,
    height: "580px",
    initialContent: `---
type: amazon
url: https://www.amazon.com/Kettlebell-Workout-Weights/dp/B08P2C6J7B
title: Yes4All Vinyl Coated Kettlebells
description: High-quality solid cast iron kettlebell encased in color-coded vinyl to prevent corrosion, increase durability, and protect flooring. Wide, smooth handle provides a comfortable & secure grip for high reps.
image: https://m.media-amazon.com/images/I/71N9X9u6S9L._AC_SL1500_.jpg
price: $34.99
---

# Recommended Equipment

I recommend using these kettlebells for the workout below.

\`\`\`wod
3x {
  15 Kettlebell Swings
  10 Goblet Squats
}
\`\`\``,
  },
};

export const FrontMatterAmazonSale: Story = {
  name: "Front Matter — Amazon (Sale)",
  args: {
    ...Default.args,
    height: "500px",
    initialContent: `---
url: https://www.amazon.com/dp/B07315FNRJ
title: Bowflex SelectTech 552 Adjustable Dumbbells
description: Each dumbbell adjusts from 5 to 52.5 pounds; adjusts in 2.5-pound increments up to the first 25 pounds. Lets you rapidly switch from one exercise to the next.
image: https://m.media-amazon.com/images/I/81+mS6T8pFL._AC_SL1500_.jpg
price: $549.00
sale_price: $429.00
---

# Home Gym Deal

These adjustable dumbbells are currently on sale!`,
  },
};

export const AllSectionTypes: Story = {
  name: "All Section Types",
  args: {
    ...Default.args,
    height: "900px",
    initialContent: `---
coach: Sarah
difficulty: Intermediate
equipment: Kettlebell, Rower
---

# Full Workout Plan

## Overview

Today's session includes a warm-up, main WOD, and cool-down.

| Phase     | Duration | Focus       |
|-----------|:--------:|-------------|
| Warm-up   | 10 min   | Mobility    |
| Main      | 20 min   | Strength    |
| Cool-down | 5 min    | Flexibility |

---
type: youtube
url: https://www.youtube.com/watch?v=dQw4w9WgXcQ
title: Kettlebell Form Guide
---

## Main WOD

\`\`\`wod
5:00 Row @moderate
3x {
  12 Kettlebell Swings
  8 Goblet Squats
  6 Turkish Get-ups
}
2:00 Rest
\`\`\`

## Notes

Great session — focus on hip hinge during swings.`,
  },
};

// Keep a plain WOD-only story for quick syntax testing
export const WodOnly: Story = {
  name: "WOD Only",
  args: {
    ...Default.args,
    initialContent: `\`\`\`wod
21-15-9
Thrusters @95lb
Pull-ups
\`\`\``,
  },
};
