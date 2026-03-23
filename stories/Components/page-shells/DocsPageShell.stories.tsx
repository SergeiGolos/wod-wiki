/**
 * DocsPageShell Stories
 *
 * Demonstrates the DocsPageShell with static sections and optional runtime demos.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { DocsPageShell } from '@/panels/page-shells/DocsPageShell';
import { HeroBanner } from '@/panels/page-shells/HeroBanner';

const meta: Meta<typeof DocsPageShell> = {
  title: 'Pages/Docs',
  component: DocsPageShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Layout shell for documentation pages. Composes HeroBanner, StickyNavPanel, and ScrollSection with optional ScopedRuntimeProvider for interactive demos.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const STATIC_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    content: (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-black tracking-tight text-foreground uppercase mb-4">
          Overview
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          WodScript is a domain-specific language for describing workouts. It
          supports timers, rep schemes, weight specifications, and structured
          protocols like AMRAP, EMOM, and FOR TIME.
        </p>
      </div>
    ),
  },
  {
    id: 'statements',
    label: 'Statements',
    content: (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-black tracking-tight text-foreground uppercase mb-4">
          Statements
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          Every line inside a <code>wod</code> block is a statement. Statements
          consist of fragments — the smallest units of workout meaning.
        </p>
        <pre className="bg-muted/30 p-4 rounded-lg text-sm font-mono">
          {`\`\`\`wod\n10 Pushups\n15 Air Squats\n\`\`\``}
        </pre>
      </div>
    ),
  },
  {
    id: 'protocols',
    label: 'Protocols',
    content: (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-black tracking-tight text-foreground uppercase mb-4">
          Protocols
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          AMRAP, EMOM, FOR TIME, and Tabata are recognized keywords that
          configure the runtime's timer and scoring behavior.
        </p>
      </div>
    ),
  },
];

/**
 * With a hero banner and static content sections.
 */
export const WithRuntimeDemo: Story = {
  render: () => (
    <DocsPageShell
      hero={
        <HeroBanner
          title="Getting Started"
          subtitle="Learn WodScript from the inside out."
          backgroundVariant="gradient"
        />
      }
      sections={STATIC_SECTIONS}
    />
  ),
};

/**
 * Static-only: no hero, no runtime sections.
 */
export const StaticOnly: Story = {
  render: () => <DocsPageShell sections={STATIC_SECTIONS} />,
};
