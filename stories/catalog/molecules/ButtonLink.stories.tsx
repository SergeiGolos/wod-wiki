import type { Meta, StoryObj } from '@storybook/react'
import { ArrowRight, BookOpen, ExternalLink, Play } from 'lucide-react'
import { ButtonLink } from '@/components/ui/ButtonLink'

const meta: Meta<typeof ButtonLink> = {
  title: 'catalog/molecules/actions/ButtonLink',
  component: ButtonLink,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="p-8 space-y-6 max-w-3xl">
        <Story />
      </div>
    ),
  ],
  args: {
    href: '#',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground font-mono">button-styled links with leading or trailing icons</p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink {...args} icon={BookOpen}>
          Read the syntax guide
        </ButtonLink>
        <ButtonLink {...args} variant="outline" icon={ExternalLink} trailingIcon={ArrowRight}>
          Open example canvas
        </ButtonLink>
      </div>
    </div>
  ),
}

export const SizesAndWidths: Story = {
  render: (args) => (
    <div className="space-y-4 w-[28rem] max-w-full">
      <p className="text-xs text-muted-foreground font-mono">size + full-width behavior for canvas sidebars and hero panels</p>
      <div className="space-y-3">
        <ButtonLink {...args} size="sm" variant="secondary" icon={Play}>
          Load simple rounds
        </ButtonLink>
        <ButtonLink {...args} fullWidth variant="outline" icon={BookOpen} trailingIcon={ArrowRight}>
          Compare named groups and nested groups in the active view
        </ButtonLink>
      </div>
    </div>
  ),
}