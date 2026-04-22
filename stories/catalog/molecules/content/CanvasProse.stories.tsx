import type { Meta, StoryObj } from '@storybook/react'
import { CanvasProse } from '../../../../playground/src/canvas/CanvasProse'

const meta = {
  title: 'catalog/molecules/content/CanvasProse',
  component: CanvasProse,
  parameters: { layout: 'padded' },

} satisfies Meta<typeof CanvasProse>

export default meta
type Story = StoryObj<typeof meta>

export const PlainParagraphs: Story = {
  args: {
    prose: `# Getting Started

Welcome to WOD Wiki — your intelligent workout companion.

Write workouts in a plain-text script language, run them in real time, and track your results automatically.

> The best workout is the one you actually do.
`,
  },
}

export const WithGfmTable: Story = {
  args: {
    prose: `## Benchmark Workouts

| Name | Movements | Time Cap |
|------|-----------|---------|
| Fran | Thrusters + Pull-ups | 10 min |
| Cindy | Push-ups + Pull-ups + Squats | 20 min |
| Murph | Run + Pull-ups + Push-ups + Squats | 60 min |

All benchmark workouts use bodyweight scaling unless otherwise noted.
`,
  },
}

export const WithFrontmatter: Story = {
  args: {
    prose: `---
title: CrossFit Total
category: strength
difficulty: advanced
time-cap: 60 min
---

## What is CrossFit Total?

Three attempts each at the:

- Back Squat
- Shoulder Press
- Deadlift

Your score is the sum of your heaviest successful lift in each movement.
`,
  },
}

export const WithCodeBlocks: Story = {
  args: {
    prose: `## WodScript Syntax

Use the WodScript language to define timed and rep-based workouts.

### Timer

\`\`\`wod
10:00 Run at pace
5x
  10 Thrusters
  10 Pull-ups
\`\`\`

### AMRAP

\`\`\`wod
20:00 AMRAP
  5 Pull-ups
  10 Push-ups
  15 Air Squats
\`\`\`

Inline code like \`5x\` and \`10:00\` is also supported.
`,
  },
}

export const WithTaskListAndLinks: Story = {
  args: {
    prose: `## Pre-Workout Checklist

- [x] Warm-up complete
- [x] Weights loaded
- [ ] Timer set
- [ ] Partner notified

See the [WOD Wiki documentation](https://github.com) for scaling options.

Download the [training plan PDF](./plan.pdf) for this cycle.
`,
  },
}

export const LongContent: Story = {
  args: {
    prose: `# The Sport of Fitness

## What is CrossFit?

CrossFit is a branded fitness regimen created by Greg Glassman. It is a strength and conditioning program consisting mainly of a mix of aerobic exercise, calisthenics, and Olympic weightlifting.

## The Ten Components of Fitness

1. **Cardiovascular endurance** — The ability of body systems to gather, process, and deliver oxygen.
2. **Stamina** — The ability of body systems to process, deliver, store, and utilise energy.
3. **Strength** — The ability of a muscular unit, or combination of muscular units, to apply force.
4. **Flexibility** — The ability to maximise the range of motion at a given joint.
5. **Power** — The ability of a muscular unit, or combination of muscular units, to apply maximum force in minimum time.
6. **Speed** — The ability to minimise the time cycle of a repeated movement.
7. **Coordination** — The ability to combine several distinct movement patterns into a singular distinct movement.
8. **Agility** — The ability to minimise transition time from one movement pattern to another.
9. **Balance** — The ability to control the placement of the body's centre of gravity in relation to its support base.
10. **Accuracy** — The ability to control movement in a given direction or at a given intensity.

---

## Scaling Principles

> "Scale the load, not the workout."

Every workout can and should be scaled to match the athlete's current fitness level. The goal is to preserve the *stimulus* of the workout, not just complete it.

| Movement | Rx | Scale 1 | Scale 2 |
|----------|----|---------|---------|
| Pull-ups | Strict | Banded | Ring rows |
| HSPU | Strict | Kipping | Pike push-up |
| Muscle-ups | Ring | Bar | Jumping |
`,
  },
}
