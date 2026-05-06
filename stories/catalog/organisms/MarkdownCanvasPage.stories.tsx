import type { Meta, StoryObj } from '@storybook/react'
import { MarkdownCanvasPage } from '../../../playground/src/canvas/MarkdownCanvasPage'
import { parseCanvasMarkdown } from '../../../playground/src/canvas/parseCanvasMarkdown'

const meta = {
  title: 'catalog/organisms/MarkdownCanvasPage',
  component: MarkdownCanvasPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Scroll-driven canvas page that renders a `ParsedCanvasPage` — a sequence of sections ' +
          'parsed from canvas-flavoured markdown. Sections after the first are observable by IntersectionObserver ' +
          'for sticky-nav highlighting. Use `parseCanvasMarkdown()` to produce the required `page` prop.',
      },
    },
  },

} satisfies Meta<typeof MarkdownCanvasPage>

export default meta
type Story = StoryObj<typeof meta>

// ── Sample canvas markdown fixtures ──────────────────────────────────────────

const PROSE_ONLY_MD = `---
template: canvas
route: /story/prose
---

# Welcome to WOD Wiki

## What is WOD Wiki?

WOD Wiki is a smart workout companion that lets you write, run, and track workouts in plain text.

> Write once, run anywhere — from your desk to the gym floor.

## How It Works

1. **Write** a workout script using the Whiteboard Script language
2. **Run** it in real time with the built-in timer
3. **Track** results automatically across sessions

## The Whiteboard Script Language

\`\`\`wod
20:00 AMRAP
  5 Pull-ups
  10 Push-ups
  15 Air Squats
\`\`\`

Short, readable, and precise.

## Scaling

Every workout can be scaled to match your current fitness level. The goal is to preserve the *stimulus*, not just complete the reps.

| Movement | Rx | Scale 1 | Scale 2 |
|----------|----|---------|---------|
| Pull-ups | Strict | Banded | Ring rows |
| Push-ups | Full | Knee | Incline |
| Air Squats | Full depth | Box squat | Partial |
`

const WITH_EDITOR_MD = `---
template: canvas
route: /story/editor
---

# Try Whiteboard Script

## The Editor

Use the editor on the right to write your own workout script.

### Syntax Quick Reference

- **Timers**: \`10:00 Run\`, \`20:00 AMRAP\`
- **Reps**: \`5x\`, \`21-15-9\`
- **Rounds**: \`3x { movements }\`
- **Rest**: \`2:00 Rest\`

## Example Workouts

### Fran

\`\`\`
21-15-9
  Thrusters
  Pull-ups
\`\`\`

### Cindy

\`\`\`
20:00 AMRAP
  5 Pull-ups
  10 Push-ups
  15 Air Squats
\`\`\`

## Running Your Workout

Click **Run** to start the timer. Results are saved automatically.

:::view
name: Whiteboard Script Editor
source: 3x\n  10 Push-ups\n  10 Pull-ups
align: right
:::
`

const parsedProseOnly = parseCanvasMarkdown(PROSE_ONLY_MD, '/story/prose')!
const parsedWithEditor = parseCanvasMarkdown(WITH_EDITOR_MD, '/story/editor')!
const LONG_SCROLL_MD = `---
template: canvas
route: /story/long-scroll
---

# Long Session Notes

## Warm-up
10:00 easy bike + dynamic mobility.

## Strength Block
\`\`\`wod
5x
  5 Back Squat @225lb
\`\`\`

## Conditioning
\`\`\`wod
20:00 AMRAP
  5 Pull-ups
  10 Push-ups
  15 Air Squats
\`\`\`

## Cooldown
Walk 800m and stretch hamstrings / quads.

## Reflection
Felt strong on rounds 1-3, pacing dropped on rounds 4-5.

## Coach Notes
Focus on faster transitions and controlled breathing between sets.

## Next Session Plan
Repeat at slightly lower load and increase total rounds target.
`

const CODE_BLOCKS_MD = `---
template: canvas
route: /story/code-blocks
---

# Embedded Code Blocks

## Workout script
\`\`\`wod
10:00 AMRAP
  10 Thrusters @75lb
  10 Toes-to-bar
\`\`\`

## Notes snippet
\`\`\`ts
const rounds = 5;
const targetPace = '1:45/round';
\`\`\`

## Scale options
\`\`\`md
- Thrusters: 65lb
- TTB: Knee raises
\`\`\`
`

const parsedLongScroll = parseCanvasMarkdown(LONG_SCROLL_MD, '/story/long-scroll')!
const parsedWithCodeBlocks = parseCanvasMarkdown(CODE_BLOCKS_MD, '/story/code-blocks')!

export const ProseOnly: Story = {
  args: {
    page: parsedProseOnly,
    wodFiles: {},
    theme: 'dark',
  },
}

export const WithEditor: Story = {
  args: {
    page: parsedWithEditor,
    wodFiles: {},
    theme: 'dark',
  },
}

export const LongContentWithScroll: Story = {
  args: {
    page: parsedLongScroll,
    wodFiles: {},
    theme: 'dark',
  },
}

export const EmbeddedCodeBlocks: Story = {
  args: {
    page: parsedWithCodeBlocks,
    wodFiles: {},
    theme: 'dark',
  },
}

export const MobileViewport: Story = {
  args: {
    page: parsedWithEditor,
    wodFiles: {},
    theme: 'dark',
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
}
