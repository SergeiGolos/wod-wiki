/**
 * Catalog / Organisms / OnboardingBanner / Credit state
 *
 * Source: wayfinder map #673, ticket #675.
 *
 * Renders visual variations of the pre-progress credit state — the
 * "Step 1 of N" pill + hint that greets a first-time user when
 * `stepsComplete <= 1`.
 *
 * Stories (all variations rendered in a sticky-header context, simulated
 * by the parent `<div className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-md">`
 * wrapper so reviewers see the design *as it will appear* once #678 lands):
 *
 *  1. Baseline — current live OnboardingBanner for comparison
 *  2. Reference — design spec's documented current shape, minus the chevron
 *  3. CompactStrip — pill + hint on one line, full-pill container, no border
 *  4. PillOnlyHintBelow — pill on its own line, hint as a secondary line below
 *  5. CenteredTheatrical — both pill and hint centered, like an announcement
 *  6. RightAlignedAction — pill left, hint middle, text+arrow affordance right
 *
 * **Note:** these are prototypes for visual review. They render an inline
 * mock component (`CreditStateMock`) so the design isn't coupled to the
 * live OnboardingBanner's current render path (which is mid-refactor for
 * the sticky layout in #678 and the lifecycle in #679). The mock takes
 * `stepsComplete`, `totalSteps`, `hint` as props.
 *
 * See `docs/design/onboarding-banner-spec.md` for the design language
 * constraints these variations must conform to.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { Check } from 'lucide-react'
import { QuestMenu } from '../../../../playground/src/components/onboarding/QuestMenu'

// ── Mock component (private to this stories file) ──────────────────────

interface CreditStateMockProps {
  stepsComplete?: number
  totalSteps?: number
  hint?: string
}

function CreditStateMock({
  stepsComplete = 1,
  totalSteps = 5,
  hint = 'Start by editing the example',
}: CreditStateMockProps) {
  const isCredit = stepsComplete <= 1
  return (
    <div className="rounded-2xl border border-brand/30 bg-brand/5 px-5 py-4">
      {isCredit && (
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-deep dark:text-brand-light">
          <span className="rounded-pill bg-brand px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-background">
            Step {stepsComplete} of {totalSteps}
          </span>
          {hint}
        </p>
      )}
    </div>
  )
}

// ── Sticky-header context wrapper (simulates the post-#678 layout) ───

function StickyContext({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-md">
      <div className="px-6 py-3">{children}</div>
    </div>
  )
}

// ── Story meta ───────────────────────────────────────────────────────

const meta = {
  title: 'catalog/organisms/OnboardingBanner/credit-state',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Five compositional variations of the OnboardingBanner credit state, plus the live ' +
          'component as a baseline. Each variation is rooted in the design spec (#674) — same brand ' +
          'tokens, motion, density, typography, iconography. The variations differ only in spatial ' +
          'composition (how the pill + hint are arranged), not in tokens.\n\n' +
          'These are prototypes for HITL review on wayfinder #675. Validators check both visual ' +
          'conformance (Sections 1–7 of the spec) and behavioral conformance (Section 8 — the credit ' +
          'state shows when stepsComplete <= 1).',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// ── Stories ──────────────────────────────────────────────────────────

export const BaselineCurrentComponent: Story = {
  name: '0. Baseline (live component)',
  render: () => (
    <StickyContext>
      <QuestMenu pageRoute="/" quests={[]} includeRoadmap />
    </StickyContext>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The live OnboardingBanner as of #675. **Comparison point only** — this rendering will be ' +
          'refactored under #678 (sticky layout) and #679 (completion lifecycle). Note: the chevron ' +
          'is still present here; the map decision removes it.',
      },
    },
  },
}

export const V1Reference: Story = {
  name: '1. Reference (spec-current)',
  render: () => (
    <StickyContext>
      <CreditStateMock />
    </StickyContext>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**Composition:** pill left, hint right on the same line, `rounded-2xl` container, `px-5 py-4`. ' +
          '**Matches the documented current shape** in the spec minus the chevron. The reference design — ' +
          'safe, predictable, "what we have today but cleaner."',
      },
    },
  },
}

export const V2CompactStrip: Story = {
  name: '2. CompactStrip (tighter)',
  render: () => (
    <StickyContext>
      <div className="rounded-full bg-brand/5 px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-deep dark:text-brand-light">
          <span className="rounded-pill bg-brand px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-background">
            Step 1 of 5
          </span>
          Start by editing the example
        </p>
      </div>
    </StickyContext>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**Composition:** pill + hint on a single tighter line, `rounded-full` container (full pill, no ' +
          'border), `px-4 py-2.5`. **Trade-off:** the most minimal — saves vertical space, reads as a ' +
          'thin status bar. **Risk:** the lack of border makes the banner blend with the page; users may ' +
          'stop noticing it.',
      },
    },
  },
}

export const V3PillOnlyHintBelow: Story = {
  name: '3. PillOnlyHintBelow (two-line)',
  render: () => (
    <StickyContext>
      <div className="rounded-2xl border border-brand/30 bg-brand/5 px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <span className="self-start rounded-pill bg-brand px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-background">
            Step 1 of 5
          </span>
          <p className="text-sm font-semibold text-brand-deep dark:text-brand-light">
            Start by editing the example
          </p>
        </div>
      </div>
    </StickyContext>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**Composition:** pill on its own line (self-start, left-aligned), hint as a separate secondary ' +
          'line below. **Trade-off:** more vertical space; clearer hierarchy (the pill is the state, the ' +
          'hint is the instruction). **Risk:** eats more of the editor real estate in a sticky context.',
      },
    },
  },
}

export const V4CenteredTheatrical: Story = {
  name: '4. CenteredTheatrical (announcement)',
  render: () => (
    <StickyContext>
      <div className="rounded-2xl border border-brand/30 bg-brand/5 px-6 py-5 text-center">
        <p className="flex flex-col items-center gap-2">
          <span className="rounded-pill bg-brand px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-background">
            Step 1 of 5
          </span>
          <span className="text-sm font-semibold text-brand-deep dark:text-brand-light">
            Start by editing the example
          </span>
        </p>
      </div>
    </StickyContext>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**Composition:** both pill and hint centered, `text-center` on the container. **Trade-off:** ' +
          'feels like an announcement — the user is being welcomed, not just informed. **Risk:** ' +
          'centered content in a sticky header can feel heavy; readers expect sticky headers to be ' +
          'informational, not theatrical. Bigger `py-5` makes this the tallest variation.',
      },
    },
  },
}

export const V5RightAlignedAction: Story = {
  name: '5. RightAlignedAction (pill+CTA)',
  render: () => (
    <StickyContext>
      <div className="rounded-2xl border border-brand/30 bg-brand/5 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-pill bg-brand px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-background">
              Step 1 of 5
            </span>
            <p className="text-sm font-semibold text-brand-deep dark:text-brand-light">
              Start by editing the example
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-deep dark:text-brand-light">
            Get started
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </StickyContext>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '**Composition:** pill + hint on the left, a "Get started →" affordance on the right. ' +
          '**Trade-off:** the affordance replaces the chevron\'s role (pointing at next action) but as text ' +
          '+ glyph instead of an animated icon. **Risk:** in a sticky header that\'s *always* visible, ' +
          'a permanent CTA is heavy — it implies "do this now" repeatedly. May be appropriate for the ' +
          'credit state (first-time user, just landed) but needs design judgment for the later states.',
      },
    },
  },
}