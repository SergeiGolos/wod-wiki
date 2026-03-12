/**
 * Planner Section Type Stories
 *
 * Showcases each section type supported by the Plan View's SectionEditor.
 * Each story preloads sample content demonstrating a specific section type.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SectionEditor } from '../../../src/components/Editor/SectionEditor';

/** Thin wrapper that hosts a SectionEditor with preset content */
const PlanPreview: React.FC<{ content: string; editable?: boolean }> = ({
  content,
  editable = true,
}) => (
  <div className="h-[600px] w-full max-w-4xl mx-auto border rounded-lg overflow-hidden bg-background">
    <SectionEditor
      initialContent={content}
      editable={editable}
      showLineNumbers={true}
      contentClassName="px-6 py-8"
    />
  </div>
);

const meta: Meta<typeof PlanPreview> = {
  title: 'Components/Planner',
  component: PlanPreview,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// 1. Title Section
// ---------------------------------------------------------------------------

export const TitleSection: Story = {
  name: 'Title',
  render: () => (
    <PlanPreview
      content={`# Morning Workout
## Warm-up Routine

A simple title section — the first text block becomes the title.`}
    />
  ),
};

// ---------------------------------------------------------------------------
// 2. Markdown Section
// ---------------------------------------------------------------------------

export const MarkdownSection: Story = {
  name: 'Markdown',
  render: () => (
    <PlanPreview
      content={`# Notes

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
Walk for 5 minutes and stretch.`}
    />
  ),
};

// ---------------------------------------------------------------------------
// 3. Markdown Tables
// ---------------------------------------------------------------------------

export const MarkdownTable: Story = {
  name: 'Markdown Table',
  render: () => (
    <PlanPreview
      content={`# Weekly Schedule

| Day       | Focus        | Duration | Intensity |
|-----------|:------------:|:--------:| ---------:|
| Monday    | Upper Body   | 45 min   | High      |
| Tuesday   | Cardio       | 30 min   | Moderate  |
| Wednesday | Lower Body   | 50 min   | High      |
| Thursday  | Rest         | —        | —         |
| Friday    | Full Body    | 60 min   | High      |
| Saturday  | Active Rest  | 30 min   | Low       |
| Sunday    | Rest         | —        | —         |

Notes below the table continue as normal markdown.`}
    />
  ),
};

// ---------------------------------------------------------------------------
// 4. WOD Block
// ---------------------------------------------------------------------------

export const WodBlock: Story = {
  name: 'WOD Block',
  render: () => (
    <PlanPreview
      content={`# AMRAP 20

\`\`\`wod
5:00 Run
2:00 Rest
3x {
  10 Push-ups
  15 Squats
  20 Sit-ups
}
\`\`\`

Good luck!`}
    />
  ),
};

// ---------------------------------------------------------------------------
// 5. Log Dialect
// ---------------------------------------------------------------------------

export const LogBlock: Story = {
  name: 'Log Block',
  render: () => (
    <PlanPreview
      content={`# Training Log — Jan 15

\`\`\`log
5:00 Run @easy
2:00 Rest
10:00 Tempo Run @moderate
3:00 Cool-down Walk
\`\`\`

Felt strong today. HR stayed in zone 2 for tempo section.`}
    />
  ),
};

// ---------------------------------------------------------------------------
// 6. Front Matter — Default (Key-Value Table)
// ---------------------------------------------------------------------------

export const FrontMatterDefault: Story = {
  name: 'Front Matter — Default',
  render: () => (
    <PlanPreview
      content={`---
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
\`\`\``}
    />
  ),
};

// ---------------------------------------------------------------------------
// 7. Front Matter — YouTube Embed
// ---------------------------------------------------------------------------

export const FrontMatterYouTube: Story = {
  name: 'Front Matter — YouTube',
  render: () => (
    <PlanPreview
      content={`---
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
\`\`\``}
    />
  ),
};

// ---------------------------------------------------------------------------
// 8. Front Matter — YouTube (Auto-detect from URL)
// ---------------------------------------------------------------------------

export const FrontMatterYouTubeAutoDetect: Story = {
  name: 'Front Matter — YouTube (Auto-detect)',
  render: () => (
    <PlanPreview
      content={`---
url: https://youtu.be/dQw4w9WgXcQ
---

# Quick Video Reference

The YouTube embed is auto-detected from the URL pattern.`}
    />
  ),
};

// ---------------------------------------------------------------------------
// 9. Front Matter — Strava Activity
// ---------------------------------------------------------------------------

export const FrontMatterStrava: Story = {
  name: 'Front Matter — Strava',
  render: () => (
    <PlanPreview
      content={`---
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

Light run to promote active recovery after yesterday's heavy lifting.`}
    />
  ),
};

// ---------------------------------------------------------------------------
// 10. Front Matter — Strava (Auto-detect)
// ---------------------------------------------------------------------------

export const FrontMatterStravaAutoDetect: Story = {
  name: 'Front Matter — Strava (Auto-detect)',
  render: () => (
    <PlanPreview
      content={`---
url: https://www.strava.com/activities/98765432
title: Hill Repeats
distance: 8km
time: 42:15
elevation: 340m
---

# Hill Training

Strava link auto-detected from URL.`}
    />
  ),
};

// ---------------------------------------------------------------------------
// 11. Front Matter — File Preview (Image)
// ---------------------------------------------------------------------------

export const FrontMatterFileImage: Story = {
  name: 'Front Matter — File (Image)',
  render: () => (
    <PlanPreview
      content={`---
type: file
file: https://picsum.photos/800/400
title: Workout Location
caption: Today's outdoor training spot
---

# Outdoor Session

Training in the park today. See photo above for the location.`}
    />
  ),
};

// ---------------------------------------------------------------------------
// 12. Front Matter — File Preview (Document)
// ---------------------------------------------------------------------------

export const FrontMatterFileDocument: Story = {
  name: 'Front Matter — File (Document)',
  render: () => (
    <PlanPreview
      content={`---
type: file
file: /data/training-plan-q1.pdf
title: Q1 Training Plan
caption: Periodization plan for January–March
---

# Quarterly Plan

Refer to the attached document for the full periodization schedule.`}
    />
  ),
};

// ---------------------------------------------------------------------------
// 13. Front Matter — Amazon Product
// ---------------------------------------------------------------------------

export const FrontMatterAmazon: Story = {
  name: 'Front Matter — Amazon',
  render: () => (
    <PlanPreview
      content={`---
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
\`\`\``}
    />
  ),
};

// ---------------------------------------------------------------------------
// 14. Front Matter — Amazon (On Sale)
// ---------------------------------------------------------------------------

export const FrontMatterAmazonSale: Story = {
  name: 'Front Matter — Amazon (Sale)',
  render: () => (
    <PlanPreview
      content={`---
url: https://www.amazon.com/dp/B07315FNRJ
title: Bowflex SelectTech 552 Adjustable Dumbbells
description: Each dumbbell adjusts from 5 to 52.5 pounds; adjusts in 2.5-pound increments up to the first 25 pounds. Lets you rapidly switch from one exercise to the next.
image: https://m.media-amazon.com/images/I/81+mS6T8pFL._AC_SL1500_.jpg
price: $549.00
sale_price: $429.00
---

# Home Gym Deal

These adjustable dumbbells are currently on sale!`}
    />
  ),
};

// ---------------------------------------------------------------------------
// 15. Combined — All Section Types
// ---------------------------------------------------------------------------

export const AllSectionTypes: Story = {
  name: 'All Section Types',
  render: () => (
    <PlanPreview
      content={`---
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

Great session — focus on hip hinge during swings.`}
    />
  ),
};
