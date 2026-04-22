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
  tags: ['autodocs'],
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
