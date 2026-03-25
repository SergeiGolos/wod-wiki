/**
 * ParallaxSection Stories
 *
 * Demonstrates the ParallaxSection primitive with different step counts
 * and configuration options.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ParallaxSection } from '@/panels/page-shells/ParallaxSection';

const meta: Meta<typeof ParallaxSection> = {
  title: 'Pages/ScriptedTutorial',
  component: ParallaxSection,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Scroll-driven section with IntersectionObserver step detection. Fires onStepChange as each step enters the viewport.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

function StepContent({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-sm">
      <h2 className="text-2xl font-black tracking-tight text-foreground uppercase mb-4">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

const THREE_STEPS = [
  {
    content: (
      <StepContent
        title="Step One"
        body="This is the first step. Scroll down to see the next step animate in."
      />
    ),
  },
  {
    content: (
      <StepContent
        title="Step Two"
        body="The IntersectionObserver tracks which step is most visible in the viewport."
      />
    ),
  },
  {
    content: (
      <StepContent
        title="Step Three"
        body="Each step fades in/out based on its visibility ratio."
      />
    ),
  },
];

/**
 * Default: Three steps with a sticky overlay panel.
 */
export const Default: Story = {
  render: () => (
    <div className="bg-background min-h-screen">
      <ParallaxSection
        id="demo"
        steps={THREE_STEPS}
        onStepChange={(step) => console.log('Active step:', step)}
      >
        <div className="w-full h-full bg-muted/30 rounded-xl flex items-center justify-center border border-border/50">
          <span className="text-sm font-bold text-muted-foreground">
            Sticky Overlay Panel
          </span>
        </div>
      </ParallaxSection>
    </div>
  ),
};

/**
 * Single step — no scrolling needed.
 */
export const SingleStep: Story = {
  render: () => (
    <div className="bg-background min-h-screen">
      <ParallaxSection
        id="single"
        steps={[THREE_STEPS[0]]}
        minHeight="60vh"
      />
    </div>
  ),
};

/**
 * Reduced motion — simple stacked layout fallback.
 * (Simulated by forcing the prefers-reduced-motion media query.)
 */
export const ReducedMotion: Story = {
  render: () => (
    <div className="bg-background min-h-screen p-6">
      <p className="text-sm text-muted-foreground mb-4">
        When <code>prefers-reduced-motion: reduce</code> is active, steps
        render as a simple vertical list.
      </p>
      <ParallaxSection
        id="reduced"
        steps={THREE_STEPS}
        className="border border-border/50 rounded-lg"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Enable "Reduce Motion" in your OS settings to see the fallback layout.',
      },
    },
  },
};
