/**
 * Catalog / Organisms / HeroSlider
 *
 * Hero slider widget variations with slice-based transitions.
 * Three transition styles: vertical slice, diagonal slice, and fade/blur.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { HeroSlider } from "@/components/Editor/widgets/HeroSlider";
import { HeroSliderDiagonal } from "@/components/Editor/widgets/HeroSliderDiagonal";
import { HeroSliderFade } from "@/components/Editor/widgets/HeroSliderFade";

// ── Shared demo slides ───────────────────────────────────────────────

const DEMO_SLIDES = [
  {
    title: "The workout studio built for fitness enthusiasts.",
    subtitle: "Plan with Markdown, execute with a precision timer, and evolve with performance insights.",
    badge: "Workout Studio",
    cta: { label: "Start Planning", href: "#" },
    bgGradient: "from-emerald-500/10 via-background to-teal-500/5",
  },
  {
    title: "Write workouts in Markdown",
    subtitle: "Draft, format, and share workouts as fast as you can type — no forms, no friction.",
    badge: "Plan",
    cta: { label: "Try the Editor", href: "#" },
    bgGradient: "from-blue-500/10 via-background to-indigo-500/5",
  },
  {
    title: "Integrated timer keeps pace",
    subtitle: "Your scripted workout comes to life. Hit Start and let the app keep the pace while you focus on the work.",
    badge: "Execute",
    cta: { label: "See Timer Demo", href: "#" },
    bgGradient: "from-amber-500/10 via-background to-orange-500/5",
  },
  {
    title: "Data-driven performance insights",
    subtitle: "Every lap tracked becomes insight. Analyse trends, visualise progress, and make informed adjustments.",
    badge: "Evolve",
    cta: { label: "View Insights", href: "#" },
    bgGradient: "from-violet-500/10 via-background to-purple-500/5",
  },
];

const SINGLE_SLIDE = [DEMO_SLIDES[0]];

// ── Story wrappers ───────────────────────────────────────────────────

interface SliderStoryProps {
  Component: React.ComponentType<any>;
  config: Record<string, unknown>;
}

const SliderStoryWrapper: React.FC<SliderStoryProps> = ({ Component, config }) => (
  <div className="h-[420px] w-full rounded-2xl border border-border/40 overflow-hidden shadow-sm">
    <Component config={config} rawContent="" sectionId="storybook-demo" />
  </div>
);

// ── Meta for HeroSlider (vertical slice) ─────────────────────────────

const metaSlider: Meta<typeof HeroSlider> = {
  title: "catalog/organisms/HeroSlider",
  component: HeroSlider,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Hero slider with vertical slice transitions. Each slide is split into vertical strips that stagger in and out with a smooth easing curve.",
      },
    },
  },
};

export default metaSlider;

type Story = StoryObj<typeof metaSlider>;

// ── HeroSlider stories ───────────────────────────────────────────────

export const VerticalSlice: Story = {
  render: () => (
    <SliderStoryWrapper
      Component={HeroSlider}
      config={{ slides: DEMO_SLIDES, intervalMs: 5000, slices: 8 }}
    />
  ),
};

export const VerticalSliceSlow: Story = {
  render: () => (
    <SliderStoryWrapper
      Component={HeroSlider}
      config={{ slides: DEMO_SLIDES, intervalMs: 8000, slices: 12 }}
    />
  ),
};

export const VerticalSliceSingle: Story = {
  render: () => (
    <SliderStoryWrapper
      Component={HeroSlider}
      config={{ slides: SINGLE_SLIDE, slices: 8 }}
    />
  ),
};

// ── HeroSliderDiagonal stories ───────────────────────────────────────

export const DiagonalSlice: Story = {
  render: () => (
    <SliderStoryWrapper
      Component={HeroSliderDiagonal}
      config={{ slides: DEMO_SLIDES, intervalMs: 5000, slices: 10, angle: -25 }}
    />
  ),
};

export const DiagonalSliceSteep: Story = {
  render: () => (
    <SliderStoryWrapper
      Component={HeroSliderDiagonal}
      config={{ slides: DEMO_SLIDES, intervalMs: 6000, slices: 12, angle: -45 }}
    />
  ),
};

// ── HeroSliderFade stories ───────────────────────────────────────────

export const FadeBlur: Story = {
  render: () => (
    <SliderStoryWrapper
      Component={HeroSliderFade}
      config={{ slides: DEMO_SLIDES, intervalMs: 5000 }}
    />
  ),
};

export const FadeBlurSlow: Story = {
  render: () => (
    <SliderStoryWrapper
      Component={HeroSliderFade}
      config={{ slides: DEMO_SLIDES, intervalMs: 8000 }}
    />
  ),
};

// ── Comparison view ──────────────────────────────────────────────────

export const AllVariations: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Vertical Slice
        </h3>
        <SliderStoryWrapper
          Component={HeroSlider}
          config={{ slides: DEMO_SLIDES, intervalMs: 6000, slices: 8 }}
        />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Diagonal Slice
        </h3>
        <SliderStoryWrapper
          Component={HeroSliderDiagonal}
          config={{ slides: DEMO_SLIDES, intervalMs: 6000, slices: 10, angle: -25 }}
        />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Fade + Blur
        </h3>
        <SliderStoryWrapper
          Component={HeroSliderFade}
          config={{ slides: DEMO_SLIDES, intervalMs: 6000 }}
        />
      </div>
    </div>
  ),
};
