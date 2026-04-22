import type { Meta, StoryObj } from '@storybook/react'
import { HomeHero } from '../../../playground/src/components/HomeHero'

const meta = {
  title: 'catalog/templates/HomeHero',
  component: HomeHero,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Hero section for the playground home page. ' +
          'Features a gradient wash, headline, subtitle, three feature cards, and CTA buttons. ' +
          'Uses `useNavigate` (provided by global MemoryRouter decorator).',
      },
    },
  },

} satisfies Meta<typeof HomeHero>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    chromatic: { viewports: [375] },
  },
}

export const Tablet: Story = {
  parameters: {
    viewport: { defaultViewport: 'tablet' },
    chromatic: { viewports: [768] },
  },
}

export const EmptyState: Story = {
  render: () => (
    <section className="min-h-[480px] flex items-center justify-center bg-background border-y border-border/40">
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-foreground">Home hero unavailable</p>
        <p className="text-xs text-muted-foreground">No featured content configured yet.</p>
      </div>
    </section>
  ),
}

export const LongTitle: Story = {
  render: () => (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-20 lg:pt-32 lg:pb-28 flex flex-col items-center text-center">
        <h1 className="max-w-4xl text-[2.25rem] font-semibold leading-[1.15] tracking-heading text-foreground sm:text-[3rem] lg:text-[3.5rem]">
          The workout studio built for fitness enthusiasts who plan, execute, and review every training cycle with precision and consistency.
        </h1>
        <p className="mt-6 max-w-xl text-lg font-normal leading-[1.5] text-muted-foreground">
          Validate long marketing copy wrapping behavior across desktop and mobile breakpoints.
        </p>
      </div>
    </section>
  ),
}

export const LoadingState: Story = {
  render: () => (
    <section className="min-h-[520px] bg-background">
      <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 space-y-6 animate-pulse">
        <div className="h-5 w-32 rounded bg-muted/70" />
        <div className="h-12 w-[80%] rounded bg-muted/70" />
        <div className="h-12 w-[65%] rounded bg-muted/60" />
        <div className="h-5 w-[75%] rounded bg-muted/60" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="h-36 rounded-2xl bg-muted/60" />
          <div className="h-36 rounded-2xl bg-muted/60" />
          <div className="h-36 rounded-2xl bg-muted/60" />
        </div>
      </div>
    </section>
  ),
}
