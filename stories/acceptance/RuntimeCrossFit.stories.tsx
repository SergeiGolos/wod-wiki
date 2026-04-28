/**
 * RuntimeCrossFit Acceptance Stories
 *
 * Layer 5 — acceptance stories. These are the PRIMARY e2e targets for
 * runtime-execution tests. Each story loads a named CrossFit benchmark
 * workout into the full StorybookWorkbench so Playwright can:
 *   1. Click into the Track view
 *   2. Drive the runtime via the Next button
 *   3. Assert round/rep/metric state from the UI
 *
 * Story IDs (used by e2e tests):
 *   acceptance-runtimecrossfit--fran
 *   acceptance-runtimecrossfit--annie
 *   acceptance-runtimecrossfit--cindy
 *   acceptance-runtimecrossfit--barbara
 *
 * All stories use the StorybookWorkbench so the full execution stack is live.
 * data-testid attributes are sourced from TestIdContract.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StorybookWorkbench } from '../_shared/StorybookWorkbench';

const meta: Meta<typeof StorybookWorkbench> = {
  title: 'acceptance/RuntimeCrossFit',
  component: StorybookWorkbench,
  parameters: {
    layout: 'fullscreen',
    // Disable a11y during acceptance stories — enforced at Layer 2
    a11y: { disable: true },
  },
};
export default meta;

type Story = StoryObj<typeof StorybookWorkbench>;

// ─ Shared base args ──────────────────────────────────────────────────────────
const BASE_ARGS = {
  showToolbar: true,
  readonly: false,
  theme: 'wod-light' as const,
  initialShowPlan: true,
  initialShowTrack: true,
  initialShowReview: true,
};

// ─ Fran — 21-15-9 Thrusters & Pull-ups ──────────────────────────────────────
// Expected: 6 effort blocks (3 rounds × 2 exercises), 7 total next() calls
export const Fran: Story = {
  args: {
    ...BASE_ARGS,
    initialContent: `# Fran

\`\`\`wod
(21-15-9)
  Thrusters @95lb
  Pull-ups
\`\`\`
`,
  },
};

// ─ Annie — 50-40-30-20-10 Double-Unders & Sit-Ups ───────────────────────────
// Expected: 10 effort blocks (5 rounds × 2 exercises), 11 total next() calls
export const Annie: Story = {
  args: {
    ...BASE_ARGS,
    initialContent: `# Annie

\`\`\`wod
(50-40-30-20-10)
  Double-Unders
  Sit-Ups
\`\`\`
`,
  },
};

// ─ Cindy — 20-min AMRAP 5/10/15 ─────────────────────────────────────────────
// Expected: Each round is 3 blocks; AMRAP continues until time expires
export const Cindy: Story = {
  args: {
    ...BASE_ARGS,
    initialContent: `# Cindy

\`\`\`wod
20:00 AMRAP
  5 Pull-ups
  10 Push-ups
  15 Air Squats
\`\`\`
`,
  },
};

// ─ Barbara — 5 rounds of 20/30/40/50 (timed rest) ───────────────────────────
// Expected: 5 rounds, each with 4 effort blocks + rest
export const Barbara: Story = {
  args: {
    ...BASE_ARGS,
    initialContent: `# Barbara

\`\`\`wod
(5)
  20 Pull-ups
  30 Push-ups
  40 Sit-ups
  50 Air Squats
  3:00 Rest
\`\`\`
`,
  },
};
