/**
 * UnifiedEditor-Mobile Stories
 *
 * Showcases the UnifiedEditor in a mobile (portrait) viewport.
 * The editor is fullscreen and fills the phone screen — same component
 * as the Web variant, rendered at narrow width so responsive behaviours
 * (e.g. hidden preview panel, compact toolbar) are visible.
 *
 * Stories:
 *  1. Default        — Fran benchmark, default editor config
 *  2. DarkTheme      — Dark theme
 *  3. ReadOnly       — Read-only preview mode (Fran)
 *  4. Fran           — Full plan view
 *  5. Cindy          — AMRAP 20 plan
 *  6. WeeklyPlan     — Multi-day training plan
 */

import type { Meta, StoryObj } from "@storybook/react";
import { UnifiedEditor } from "@/components/Editor/UnifiedEditor";
import { CommandProvider } from "@/components/command-palette/CommandContext";
import { fn } from "storybook/test";
import { useState } from "react";

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
      <div className="h-full w-full flex flex-col box-border">
        <div className="border rounded-lg overflow-hidden w-full flex-1 min-h-0">
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
  title: "Panels/UnifiedEditor/Mobile",
  component: UnifiedEditorWrapper,
  decorators: [
    (Story) => (
      <div style={{ width: '390px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "UnifiedEditor rendered at mobile (portrait) dimensions. " +
          "Use this to verify responsive behaviours — compact toolbar, " +
          "hidden preview panel — that only appear below 768 px.",
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
// Stories
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
    showLineNumbers: false,
    height: "844px",
  },
};

export const DarkTheme: Story = {
  name: "Dark Theme",
  args: {
    ...Default.args,
    theme: "dark",
  },
};

export const ReadOnly: Story = {
  name: "Read-Only Preview (Fran)",
  args: {
    ...Default.args,
    readonly: true,
  },
};

export const Fran: Story = {
  name: "Fran (21-15-9)",
  args: {
    ...Default.args,
    initialContent: FRAN_CONTENT,
  },
};

export const CindyAmrap: Story = {
  name: "Cindy (AMRAP 20)",
  args: {
    ...Default.args,
    initialContent: CINDY_CONTENT,
  },
};

export const WeeklyPlan: Story = {
  name: "Weekly Training Plan",
  args: {
    ...Default.args,
    initialContent: WEEKLY_PLAN_CONTENT,
  },
};
